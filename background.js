const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

// Debug logging helper
function debug(message, ...args) {
  console.log(`[Proompter Debug] ${message}`, ...args);
}

// On extension install or update
chrome.runtime.onInstalled.addListener((details) => {
  debug('Extension installed/updated:', details.reason);
});

// Default prompt templates
const DEFAULT_TEMPLATES = {
  coding: "As an expert software developer, enhance this prompt to include: specific programming language requirements, desired output format, performance considerations, error handling expectations, and any relevant technical constraints. Original prompt: ",
  writing: "As a professional writer, enhance this prompt to include: tone requirements, target audience, desired length, style preferences, and key points to address. Original prompt: ",
  analysis: "As a data analyst, enhance this prompt to include: specific metrics to analyze, data format requirements, visualization preferences, statistical methods to use, and desired insights. Original prompt: ",
  creative: "As a creative director, enhance this prompt to include: style guidelines, mood/tone requirements, technical specifications, target audience, and key creative elements. Original prompt: ",
  business: "As a business consultant, enhance this prompt to include: industry context, target metrics, stakeholder considerations, timeline expectations, and desired business outcomes. Original prompt: "
};

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  debug('Command received:', command);
  if (command === 'enhance-selection') {
    debug('Enhance selection command triggered');
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      debug('Active tab:', tabs[0]?.id);
      if (tabs[0]) {
        // Ensure content script is injected
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          });
          debug('Content script injected successfully');
        } catch (e) {
          debug('Content script injection error (might already be injected):', e);
        }
        
        await handleSelectionEnhancement(tabs[0].id);
      } else {
        console.error('No active tab found');
      }
    } catch (error) {
      console.error('Error handling shortcut:', error);
    }
  }
});

// Handle messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debug('Message received:', request.action);
  if (request.action === 'enhancePrompt') {
    enhancePrompt(request.data)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Will respond asynchronously
  }
});

async function handleSelectionEnhancement(tabId) {
  try {
    debug('Handling selection enhancement for tab:', tabId);
    // Get selected text
    const response = await chrome.tabs.sendMessage(tabId, { action: 'getSelection' });
    debug('Selection response:', response);
    if (!response?.selectedText) {
      debug('No text selected');
      return;
    }

    // Get saved API keys and templates
    const storage = await chrome.storage.local.get(['openai_api_key', 'anthropic_api_key', 'custom_templates', 'last_used_template']);
    debug('Storage loaded, API keys present:', {
      openai: !!storage.openai_api_key,
      anthropic: !!storage.anthropic_api_key
    });
    
    const apiKey = storage.openai_api_key || storage.anthropic_api_key;
    const provider = storage.openai_api_key ? 'openai' : 'anthropic';
    const customTemplates = storage.custom_templates || {};

    if (!apiKey) {
      throw new Error('⚠️ API Key Required\n\nTo use the shortcut:\n1. Click the Proompter icon in your toolbar\n2. Enter your OpenAI or Anthropic API key\n3. Click Save\n\nThen try the shortcut again!');
    }

    // Use last used template if available, otherwise default to 'writing'
    const templateType = storage.last_used_template || 'writing';
    debug('Using template:', templateType);

    // Enhance the prompt
    const result = await enhancePrompt({
      type: templateType,
      prompt: response.selectedText,
      apiKey,
      provider,
      customTemplates
    });

    debug('Enhancement successful, copying to clipboard');
    // Send enhanced text back to content script to copy to clipboard
    await chrome.tabs.sendMessage(tabId, {
      action: 'setClipboard',
      text: result.enhancedPrompt
    });

  } catch (error) {
    console.error('Error in handleSelectionEnhancement:', error);
    // Show error in the active tab
    chrome.tabs.sendMessage(tabId, {
      action: 'setClipboard',
      text: error.message
    });
  }
}

async function enhancePrompt({ type, prompt, apiKey, provider = 'openai', customTemplates = {} }) {
  debug('Enhancing prompt with provider:', provider);
  if (!apiKey) {
    throw new Error('⚠️ API Key Required\n\nTo use the shortcut:\n1. Click the Proompter icon in your toolbar\n2. Enter your OpenAI or Anthropic API key\n3. Click Save\n\nThen try the shortcut again!');
  }

  let template;
  if (type.startsWith('custom_')) {
    const templateName = type.replace('custom_', '');
    template = customTemplates[templateName];
    if (!template) {
      throw new Error('Custom template not found');
    }
    // Replace {prompt} placeholder with actual prompt
    template = template.replace('{prompt}', prompt);
  } else {
    template = DEFAULT_TEMPLATES[type] || DEFAULT_TEMPLATES.writing;
    template = template + prompt;
  }

  // Save last used template
  chrome.storage.local.set({ last_used_template: type });

  if (provider === 'openai') {
    const response = await fetch(OPENAI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert prompt engineer. Your task is to enhance user prompts to be more specific, detailed, and effective."
          },
          {
            role: "user",
            content: template
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to enhance prompt');
    }

    const data = await response.json();
    return {
      enhancedPrompt: data.choices[0].message.content
    };
  } else if (provider === 'anthropic') {
    const response = await fetch(ANTHROPIC_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        messages: [
          {
            role: "user",
            content: template
          }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to enhance prompt');
    }

    const data = await response.json();
    return {
      enhancedPrompt: data.content[0].text
    };
  } else {
    throw new Error('Invalid provider specified');
  }
}