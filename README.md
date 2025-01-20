# Proompt - AI Prompt Enhancement Extension

Proompter is a Chrome extension that helps you create better prompts for AI models. It takes your basic prompts and enhances them with relevant context, requirements, and specifications based on your use case.

## Features

- 🚀 One-click prompt enhancement
- ⌨️ Keyboard shortcut (Ctrl+Shift+E or Cmd+Shift+E)
- 🔄 Support for both OpenAI and Anthropic models
- 📝 Multiple prompt templates for different use cases:
  - Coding
  - Writing
  - Analysis
  - Creative
  - Business
- ✨ Custom template creation
- 🔒 Secure local API key storage

## Installation

1. Clone this repository or download the source code
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project folder

## Setup

1. Click the Proompter icon in your Chrome toolbar
2. Select your preferred AI provider (OpenAI or Anthropic)
3. Enter your API key and click "Save"
4. Choose a prompt type or create your own custom template

## Usage

### Method 1: Keyboard Shortcut
1. Select any text you want to enhance
2. Press `Ctrl+Shift+E` (Windows/Linux) or `Cmd+Shift+E` (Mac)
3. The enhanced prompt will be automatically copied to your clipboard

### Method 2: Extension Popup
1. Click the Proompter icon in your toolbar
2. Select the type of prompt you're writing
3. Enter your basic prompt
4. Click "Enhance Prompt"
5. Copy the enhanced result

## Creating Custom Templates

1. Click the ⚙️ icon next to the prompt type selector
2. Enter a name for your template
3. Write your template using `{prompt}` where you want the user's text to go
4. Click "Add Template"

Example template:
```
As a technical writer, enhance this documentation to include: clear structure, examples, prerequisites, and troubleshooting steps. Original text: {prompt}
```

## Supported Models

- OpenAI: GPT-4o
- Anthropic: Claude 3 Sonnet

## API Keys

- OpenAI API key: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- Anthropic API key: Get from [Anthropic Console](https://console.anthropic.com/)

Your API keys are stored locally in your browser and are never sent to any server other than the respective AI providers.

## Privacy & Security

- All processing is done through official OpenAI/Anthropic APIs
- API keys are stored locally using Chrome's secure storage
- No data is collected or sent to any third-party servers
- The extension only requires minimal permissions necessary for functionality

## Development

The extension is built using vanilla JavaScript and Chrome Extension APIs. To modify:

1. Edit the source files:
   - `manifest.json`: Extension configuration
   - `popup.html/css/js`: UI and interaction
   - `background.js`: Core functionality
   - `content.js`: Page interaction

2. Test changes:
   - Go to `chrome://extensions/`
   - Click the refresh icon on the extension card
   - Or reload the unpacked extension

## License

MIT License - Feel free to modify and distribute as needed. 
