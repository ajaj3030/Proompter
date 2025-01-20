document.addEventListener('DOMContentLoaded', () => {
  const promptType = document.getElementById('promptType');
  const userPrompt = document.getElementById('userPrompt');
  const enhanceButton = document.getElementById('enhancePrompt');
  const enhancedPrompt = document.getElementById('enhancedPrompt');
  const copyButton = document.getElementById('copyPrompt');
  const apiKeyInput = document.getElementById('apiKey');
  const saveKeyButton = document.getElementById('saveKey');
  const apiKeyLabel = document.getElementById('apiKeyLabel');
  const providerButtons = document.querySelectorAll('.provider-btn');
  const manageTemplatesButton = document.getElementById('manageTemplates');
  const templateModal = document.getElementById('templateModal');
  const closeModalButton = templateModal.querySelector('.close-button');
  const templateList = templateModal.querySelector('.template-list');
  const addTemplateButton = document.getElementById('addTemplate');
  const templateNameInput = document.getElementById('templateName');
  const templateContentInput = document.getElementById('templateContent');

  let currentProvider = 'openai';
  let customTemplates = {};

  // Load custom templates
  chrome.storage.local.get(['custom_templates'], (result) => {
    if (result.custom_templates) {
      customTemplates = result.custom_templates;
      updateTemplateList();
      updatePromptTypeOptions();
    }
  });

  // Handle provider selection
  providerButtons.forEach(button => {
    button.addEventListener('click', () => {
      const provider = button.dataset.provider;
      currentProvider = provider;
      
      // Update UI
      providerButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update API key label and placeholder
      apiKeyLabel.textContent = `${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key:`;
      
      // Load saved API key for this provider
      chrome.storage.local.get([`${provider}_api_key`], (result) => {
        apiKeyInput.value = result[`${provider}_api_key`] || '';
      });
    });
  });

  // Template Management
  manageTemplatesButton.addEventListener('click', () => {
    templateModal.style.display = 'block';
  });

  closeModalButton.addEventListener('click', () => {
    templateModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === templateModal) {
      templateModal.style.display = 'none';
    }
  });

  addTemplateButton.addEventListener('click', () => {
    const name = templateNameInput.value.trim();
    const content = templateContentInput.value.trim();

    if (name && content) {
      customTemplates[name] = content;
      chrome.storage.local.set({ custom_templates: customTemplates }, () => {
        updateTemplateList();
        updatePromptTypeOptions();
        templateNameInput.value = '';
        templateContentInput.value = '';
      });
    }
  });

  function updateTemplateList() {
    templateList.innerHTML = '';
    Object.entries(customTemplates).forEach(([name, content]) => {
      const templateItem = document.createElement('div');
      templateItem.className = 'template-item';
      templateItem.innerHTML = `
        <span class="template-name">${name}</span>
        <div class="template-actions">
          <button class="delete-template" data-name="${name}">Delete</button>
        </div>
      `;
      templateList.appendChild(templateItem);
    });

    // Add delete event listeners
    templateList.querySelectorAll('.delete-template').forEach(button => {
      button.addEventListener('click', (e) => {
        const name = e.target.dataset.name;
        delete customTemplates[name];
        chrome.storage.local.set({ custom_templates: customTemplates }, () => {
          updateTemplateList();
          updatePromptTypeOptions();
        });
      });
    });
  }

  function updatePromptTypeOptions() {
    // Save current selection
    const currentSelection = promptType.value;
    
    // Clear existing options
    promptType.innerHTML = `
      <option value="coding">Coding</option>
      <option value="writing">Writing</option>
      <option value="analysis">Analysis</option>
      <option value="creative">Creative</option>
      <option value="business">Business</option>
    `;

    // Add custom templates
    Object.keys(customTemplates).forEach(name => {
      const option = document.createElement('option');
      option.value = `custom_${name}`;
      option.textContent = name;
      promptType.appendChild(option);
    });

    // Restore selection if it still exists
    if ([...promptType.options].some(opt => opt.value === currentSelection)) {
      promptType.value = currentSelection;
    }
  }

  // Load saved API key on startup
  chrome.storage.local.get(['openai_api_key'], (result) => {
    if (result.openai_api_key) {
      apiKeyInput.value = result.openai_api_key;
    }
  });

  // Save API key
  saveKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({ [`${currentProvider}_api_key`]: apiKey }, () => {
        saveKeyButton.textContent = 'Saved!';
        setTimeout(() => {
          saveKeyButton.textContent = 'Save';
        }, 1500);
      });
    }
  });

  enhanceButton.addEventListener('click', async () => {
    const type = promptType.value;
    const prompt = userPrompt.value;
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      alert('Please enter your API key first!');
      return;
    }

    if (!prompt.trim()) {
      alert('Please enter a prompt first!');
      return;
    }

    enhanceButton.disabled = true;
    enhanceButton.textContent = 'Enhancing...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'enhancePrompt',
        data: {
          type,
          prompt,
          apiKey,
          provider: currentProvider,
          customTemplates
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      enhancedPrompt.value = response.enhancedPrompt;
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to enhance prompt: ' + error.message);
    } finally {
      enhanceButton.disabled = false;
      enhanceButton.textContent = 'Enhance Prompt';
    }
  });

  copyButton.addEventListener('click', () => {
    enhancedPrompt.select();
    document.execCommand('copy');
    
    const originalText = copyButton.textContent;
    copyButton.textContent = 'Copied!';
    setTimeout(() => {
      copyButton.textContent = originalText;
    }, 1500);
  });
}); 