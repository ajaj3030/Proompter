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
  coding: "As an expert software developer, I need you to help implement this request. Please provide working code that meets these requirements. Important considerations to specify: programming language and version, input/output formats, performance requirements (time/space complexity, memory usage), error handling approach, edge cases to handle, and any technical constraints (dependencies, platform requirements). The response MUST include complete, properly formatted code that can be copied and used directly. After the code, briefly explain key implementation decisions. Original prompt: ",
  writing: "As a professional writer, enhance this writing prompt by considering: target audience demographics and knowledge level, exact tone (formal, casual, technical, etc.), precise word count or length range, specific style elements (voice, perspective, literary devices to use/avoid), key themes or messages to emphasize, structural requirements (paragraphs, sections, headers), and citation/reference format if needed. Original prompt: ",
  analysis: "As a data analyst, enhance this analysis request by specifying: exact metrics and KPIs to calculate, required statistical methods (regression, clustering, etc.), data cleaning/preprocessing steps, preferred visualization types with design requirements (charts, graphs, dashboards), confidence levels for statistical tests, segmentation criteria, and format for delivering insights (report structure, key findings to highlight). Original prompt: ",
  creative: "As a creative director, enhance this creative brief by defining: exact style guidelines (colors, fonts, imagery style), emotional response to evoke, technical specifications (dimensions, resolution, file formats), target audience psychographics, brand voice alignment, key visual/narrative elements to include, creative references/inspiration, and success metrics for the creative output. Original prompt: ",
  business: "As a business consultant, enhance this business request by including: detailed industry context and market position, specific quantifiable metrics (ROI, KPIs, growth targets), complete stakeholder analysis (internal/external), explicit timeline with milestones, budget constraints, risk factors to address, competitive considerations, and desired business outcomes with success criteria. Original prompt: "
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