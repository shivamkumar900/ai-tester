/* ======================================
   AI Playground — Application Logic
   ====================================== */

// ===== Provider & Model Configurations =====
const PROVIDERS = {
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, inputCost: 2.5, outputCost: 10 },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, inputCost: 0.15, outputCost: 0.6 },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, inputCost: 10, outputCost: 30 },
            { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192, inputCost: 30, outputCost: 60 },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385, inputCost: 0.5, outputCost: 1.5 },
            { id: 'o1', name: 'o1', contextWindow: 200000, inputCost: 15, outputCost: 60 },
            { id: 'o1-mini', name: 'o1 Mini', contextWindow: 128000, inputCost: 3, outputCost: 12 },
            { id: 'o3-mini', name: 'o3 Mini', contextWindow: 200000, inputCost: 1.1, outputCost: 4.4 },
        ],
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }),
        buildBody: (messages, model, params, stream) => ({
            model,
            messages,
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            top_p: params.topP,
            stream
        }),
        parseStream: 'openai',
        parseResponse: (data) => ({
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage || {}
        })
    },
    anthropic: {
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1/messages',
        models: [
            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000, inputCost: 3, outputCost: 15 },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000, inputCost: 3, outputCost: 15 },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000, inputCost: 0.8, outputCost: 4 },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000, inputCost: 15, outputCost: 75 },
        ],
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        }),
        buildBody: (messages, model, params, stream) => {
            const systemMsg = messages.find(m => m.role === 'system');
            const otherMsgs = messages.filter(m => m.role !== 'system');
            const body = {
                model,
                messages: otherMsgs,
                max_tokens: params.maxTokens,
                temperature: params.temperature,
                top_p: params.topP,
                stream
            };
            if (systemMsg) body.system = systemMsg.content;
            return body;
        },
        parseStream: 'anthropic',
        parseResponse: (data) => ({
            content: data.content?.[0]?.text || '',
            usage: { prompt_tokens: data.usage?.input_tokens, completion_tokens: data.usage?.output_tokens }
        })
    },
    google: {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
        streamUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse',
        models: [
            { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', contextWindow: 1048576, inputCost: 1.25, outputCost: 10 },
            { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash', contextWindow: 1048576, inputCost: 0.15, outputCost: 0.6 },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1048576, inputCost: 0.1, outputCost: 0.4 },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2097152, inputCost: 1.25, outputCost: 5 },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1048576, inputCost: 0.075, outputCost: 0.3 },
        ],
        headers: (apiKey) => ({
            'Content-Type': 'application/json'
        }),
        buildBody: (messages, model, params, stream) => {
            const systemMsg = messages.find(m => m.role === 'system');
            const otherMsgs = messages.filter(m => m.role !== 'system');
            const contents = otherMsgs.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
            const body = {
                contents,
                generationConfig: {
                    temperature: params.temperature,
                    maxOutputTokens: params.maxTokens,
                    topP: params.topP
                }
            };
            if (systemMsg) {
                body.systemInstruction = { parts: [{ text: systemMsg.content }] };
            }
            return body;
        },
        getUrl: (baseUrl, model, apiKey, stream) => {
            const url = stream
                ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
                : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            return url;
        },
        parseStream: 'google',
        parseResponse: (data) => ({
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
            usage: {
                prompt_tokens: data.usageMetadata?.promptTokenCount,
                completion_tokens: data.usageMetadata?.candidatesTokenCount
            }
        })
    },
    groq: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        models: [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextWindow: 128000, inputCost: 0.59, outputCost: 0.79 },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', contextWindow: 128000, inputCost: 0.05, outputCost: 0.08 },
            { id: 'llama3-70b-8192', name: 'Llama 3 70B', contextWindow: 8192, inputCost: 0.59, outputCost: 0.79 },
            { id: 'llama3-8b-8192', name: 'Llama 3 8B', contextWindow: 8192, inputCost: 0.05, outputCost: 0.08 },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, inputCost: 0.24, outputCost: 0.24 },
            { id: 'gemma2-9b-it', name: 'Gemma 2 9B', contextWindow: 8192, inputCost: 0.2, outputCost: 0.2 },
        ],
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }),
        buildBody: (messages, model, params, stream) => ({
            model,
            messages,
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            top_p: params.topP,
            stream
        }),
        parseStream: 'openai',
        parseResponse: (data) => ({
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage || {}
        })
    },
    mistral: {
        name: 'Mistral AI',
        baseUrl: 'https://api.mistral.ai/v1/chat/completions',
        models: [
            { id: 'mistral-large-latest', name: 'Mistral Large', contextWindow: 128000, inputCost: 2, outputCost: 6 },
            { id: 'mistral-medium-latest', name: 'Mistral Medium', contextWindow: 32000, inputCost: 2.7, outputCost: 8.1 },
            { id: 'mistral-small-latest', name: 'Mistral Small', contextWindow: 32000, inputCost: 0.2, outputCost: 0.6 },
            { id: 'open-mistral-nemo', name: 'Mistral Nemo', contextWindow: 128000, inputCost: 0.15, outputCost: 0.15 },
            { id: 'codestral-latest', name: 'Codestral', contextWindow: 32000, inputCost: 0.2, outputCost: 0.6 },
        ],
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }),
        buildBody: (messages, model, params, stream) => ({
            model,
            messages,
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            top_p: params.topP,
            stream
        }),
        parseStream: 'openai',
        parseResponse: (data) => ({
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage || {}
        })
    },
    deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/chat/completions',
        models: [
            { id: 'deepseek-chat', name: 'DeepSeek V3', contextWindow: 64000, inputCost: 0.27, outputCost: 1.1 },
            { id: 'deepseek-reasoner', name: 'DeepSeek R1', contextWindow: 64000, inputCost: 0.55, outputCost: 2.19 },
        ],
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }),
        buildBody: (messages, model, params, stream) => ({
            model,
            messages,
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            top_p: params.topP,
            stream
        }),
        parseStream: 'openai',
        parseResponse: (data) => ({
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage || {}
        })
    },
    openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        models: [
            { id: 'openai/gpt-4o', name: 'GPT-4o (via OR)', contextWindow: 128000, inputCost: 2.5, outputCost: 10 },
            { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4 (via OR)', contextWindow: 200000, inputCost: 3, outputCost: 15 },
            { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro (via OR)', contextWindow: 1048576, inputCost: 1.25, outputCost: 10 },
            { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (via OR)', contextWindow: 128000, inputCost: 0.4, outputCost: 0.4 },
            { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (via OR)', contextWindow: 64000, inputCost: 0.55, outputCost: 2.19 },
            { id: 'mistralai/mistral-large', name: 'Mistral Large (via OR)', contextWindow: 128000, inputCost: 2, outputCost: 6 },
        ],
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }),
        buildBody: (messages, model, params, stream) => ({
            model,
            messages,
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            top_p: params.topP,
            stream
        }),
        parseStream: 'openai',
        parseResponse: (data) => ({
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage || {}
        })
    },
    custom: {
        name: 'Custom Endpoint',
        baseUrl: '',
        models: [
            { id: 'custom-model', name: 'Custom Model', contextWindow: 128000, inputCost: 0, outputCost: 0 },
        ],
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }),
        buildBody: (messages, model, params, stream) => ({
            model,
            messages,
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            top_p: params.topP,
            stream
        }),
        parseStream: 'openai',
        parseResponse: (data) => ({
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage || {}
        })
    }
};

// ===== Application State =====
const state = {
    provider: 'openai',
    apiKey: '',
    model: '',
    messages: [],        // conversation history
    isStreaming: false,
    abortController: null,
    session: {
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        latencies: [],
        history: []
    }
};

// ===== DOM References =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
    providerSelect: $('#provider-select'),
    apiKeyInput: $('#api-key-input'),
    toggleKeyVisibility: $('#toggle-key-visibility'),
    customEndpointGroup: $('#custom-endpoint-group'),
    customEndpoint: $('#custom-endpoint'),
    modelSelect: $('#model-select'),
    connectionStatus: $('#connection-status'),
    temperatureSlider: $('#temperature-slider'),
    temperatureValue: $('#temperature-value'),
    maxTokensInput: $('#max-tokens-input'),
    maxTokensValue: $('#max-tokens-value'),
    topPSlider: $('#top-p-slider'),
    topPValue: $('#top-p-value'),
    systemPrompt: $('#system-prompt'),
    streamToggle: $('#stream-toggle'),
    chatMessages: $('#chat-messages'),
    welcomeScreen: $('#welcome-screen'),
    userInput: $('#user-input'),
    charCount: $('#char-count'),
    btnSend: $('#btn-send'),
    modelIndicator: $('#model-indicator'),
    tokenEstimate: $('#token-estimate'),
    btnClearChat: $('#btn-clear-chat'),
    btnExport: $('#btn-export'),
    btnSettings: $('#btn-settings'),
    settingsPanel: $('#settings-panel'),
    // Stats
    statLatency: $('#stat-latency'),
    statTTFB: $('#stat-ttfb'),
    statTokensIn: $('#stat-tokens-in'),
    statTokensOut: $('#stat-tokens-out'),
    statSpeed: $('#stat-speed'),
    statCost: $('#stat-cost'),
    sessionMessages: $('#session-messages'),
    sessionTokens: $('#session-tokens'),
    sessionCost: $('#session-cost'),
    sessionAvgLatency: $('#session-avg-latency'),
    responseHistory: $('#response-history'),
};

// ===== Initialization =====
function init() {
    loadSavedState();
    populateModels();
    bindEvents();
    updateConnectionStatus();
    updateModelIndicator();
    autoResizeTextarea();
}

function loadSavedState() {
    try {
        const saved = localStorage.getItem('ai-playground-state');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.provider) {
                state.provider = parsed.provider;
                DOM.providerSelect.value = parsed.provider;
            }
            if (parsed.apiKey) {
                state.apiKey = parsed.apiKey;
                DOM.apiKeyInput.value = parsed.apiKey;
            }
            if (parsed.model) {
                state.model = parsed.model;
            }
            if (parsed.systemPrompt) {
                DOM.systemPrompt.value = parsed.systemPrompt;
            }
            if (parsed.temperature !== undefined) {
                DOM.temperatureSlider.value = parsed.temperature;
                DOM.temperatureValue.textContent = parsed.temperature;
            }
            if (parsed.maxTokens !== undefined) {
                DOM.maxTokensInput.value = parsed.maxTokens;
                DOM.maxTokensValue.textContent = parsed.maxTokens;
            }
            if (parsed.topP !== undefined) {
                DOM.topPSlider.value = parsed.topP;
                DOM.topPValue.textContent = parsed.topP;
            }
            if (parsed.customEndpoint) {
                DOM.customEndpoint.value = parsed.customEndpoint;
            }
        }
    } catch (e) {
        console.warn('Failed to load saved state:', e);
    }
}

function saveState() {
    try {
        localStorage.setItem('ai-playground-state', JSON.stringify({
            provider: state.provider,
            apiKey: state.apiKey,
            model: state.model,
            systemPrompt: DOM.systemPrompt.value,
            temperature: DOM.temperatureSlider.value,
            maxTokens: DOM.maxTokensInput.value,
            topP: DOM.topPSlider.value,
            customEndpoint: DOM.customEndpoint.value
        }));
    } catch (e) {
        console.warn('Failed to save state:', e);
    }
}

// ===== Model Population =====
function populateModels() {
    const provider = PROVIDERS[state.provider];
    DOM.modelSelect.innerHTML = '<option value="">Select a model...</option>';
    provider.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        DOM.modelSelect.appendChild(option);
    });
    // Restore saved model if it belongs to current provider
    if (state.model && provider.models.some(m => m.id === state.model)) {
        DOM.modelSelect.value = state.model;
    } else {
        state.model = '';
    }
    updateModelIndicator();
}

// ===== Event Bindings =====
function bindEvents() {
    // Provider change
    DOM.providerSelect.addEventListener('change', (e) => {
        state.provider = e.target.value;
        populateModels();
        updateConnectionStatus();
        DOM.customEndpointGroup.classList.toggle('hidden', state.provider !== 'custom');
        saveState();
    });

    // API Key
    DOM.apiKeyInput.addEventListener('input', (e) => {
        state.apiKey = e.target.value.trim();
        updateConnectionStatus();
        saveState();
    });

    // Toggle key visibility
    DOM.toggleKeyVisibility.addEventListener('click', () => {
        const input = DOM.apiKeyInput;
        input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Model change
    DOM.modelSelect.addEventListener('change', (e) => {
        state.model = e.target.value;
        updateModelIndicator();
        updateConnectionStatus();
        saveState();
    });

    // Parameter sliders
    DOM.temperatureSlider.addEventListener('input', (e) => {
        DOM.temperatureValue.textContent = e.target.value;
        saveState();
    });

    DOM.maxTokensInput.addEventListener('input', (e) => {
        DOM.maxTokensValue.textContent = e.target.value;
        saveState();
    });

    DOM.topPSlider.addEventListener('input', (e) => {
        DOM.topPValue.textContent = e.target.value;
        saveState();
    });

    // System prompt
    DOM.systemPrompt.addEventListener('change', saveState);

    // Custom endpoint
    DOM.customEndpoint.addEventListener('input', saveState);

    // Show/hide custom endpoint field on load
    DOM.customEndpointGroup.classList.toggle('hidden', state.provider !== 'custom');

    // User input
    DOM.userInput.addEventListener('input', () => {
        autoResizeTextarea();
        DOM.charCount.textContent = DOM.userInput.value.length;
        DOM.btnSend.disabled = !DOM.userInput.value.trim();
        // Rough token estimate
        const words = DOM.userInput.value.trim().split(/\s+/).filter(Boolean).length;
        DOM.tokenEstimate.textContent = words > 0 ? `~${Math.ceil(words * 1.3)} tokens` : '';
    });

    // Send message
    DOM.btnSend.addEventListener('click', sendMessage);
    DOM.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!DOM.btnSend.disabled) sendMessage();
        }
    });

    // Quick prompts
    $$('.quick-prompt').forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.userInput.value = btn.dataset.prompt;
            DOM.userInput.dispatchEvent(new Event('input'));
            DOM.userInput.focus();
        });
    });

    // Clear chat
    DOM.btnClearChat.addEventListener('click', clearChat);

    // Export chat
    DOM.btnExport.addEventListener('click', exportChat);

    // Toggle settings
    DOM.btnSettings.addEventListener('click', () => {
        DOM.settingsPanel.classList.toggle('open');
        DOM.btnSettings.classList.toggle('active');
    });
}

// ===== UI State Updates =====
function updateConnectionStatus() {
    const hasKey = !!state.apiKey;
    const hasModel = !!state.model;
    const ready = hasKey && hasModel;

    const statusEl = DOM.connectionStatus;
    statusEl.classList.toggle('connected', ready);
    const textEl = statusEl.querySelector('.status-text');

    if (ready) {
        const providerName = PROVIDERS[state.provider].name;
        textEl.textContent = `Connected to ${providerName}`;
    } else if (!hasKey) {
        textEl.textContent = 'Enter your API key';
    } else {
        textEl.textContent = 'Select a model';
    }
}

function updateModelIndicator() {
    if (state.model) {
        const provider = PROVIDERS[state.provider];
        const modelInfo = provider.models.find(m => m.id === state.model);
        DOM.modelIndicator.textContent = modelInfo ? `${provider.name} · ${modelInfo.name}` : state.model;
        DOM.modelIndicator.style.color = 'var(--accent-indigo)';
    } else {
        DOM.modelIndicator.textContent = 'No model selected';
        DOM.modelIndicator.style.color = 'var(--text-tertiary)';
    }
}

function autoResizeTextarea() {
    const ta = DOM.userInput;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
}

// ===== Chat Functions =====
function clearChat() {
    state.messages = [];
    DOM.chatMessages.innerHTML = '';
    DOM.chatMessages.appendChild(DOM.welcomeScreen || createWelcomeScreen());
    if (DOM.welcomeScreen) DOM.welcomeScreen.style.display = 'flex';
    // Reset session
    state.session = { messageCount: 0, totalTokens: 0, totalCost: 0, latencies: [], history: [] };
    updateSessionStats();
    // Reset per-response stats
    DOM.statLatency.textContent = '—';
    DOM.statTTFB.textContent = '—';
    DOM.statTokensIn.textContent = '—';
    DOM.statTokensOut.textContent = '—';
    DOM.statSpeed.textContent = '—';
    DOM.statCost.textContent = '—';
    DOM.responseHistory.innerHTML = '<p class="empty-state">No responses yet</p>';
}

function exportChat() {
    if (state.messages.length === 0) return;
    const lines = state.messages.map(m => {
        const role = m.role.charAt(0).toUpperCase() + m.role.slice(1);
        return `## ${role}\n\n${m.content}\n`;
    });
    const providerName = PROVIDERS[state.provider]?.name || state.provider;
    const modelName = state.model || 'unknown';
    const header = `# AI Playground Chat Export\n- Provider: ${providerName}\n- Model: ${modelName}\n- Date: ${new Date().toLocaleString()}\n\n---\n\n`;
    const content = header + lines.join('\n---\n\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

// ===== Message Rendering =====
function addMessage(role, content, meta = {}) {
    // Hide welcome screen
    if (DOM.welcomeScreen) DOM.welcomeScreen.style.display = 'none';

    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}`;

    const avatarText = role === 'user' ? 'You' : role === 'error' ? '!' : 'AI';
    const roleText = role === 'user' ? 'You' : role === 'error' ? 'Error' : PROVIDERS[state.provider]?.name || 'Assistant';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    msgEl.innerHTML = `
        <div class="message-avatar">${avatarText}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-role">${roleText}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${role === 'assistant' ? '' : escapeHtml(content)}</div>
            ${role === 'assistant' ? '<div class="message-meta"></div>' : ''}
        </div>
    `;

    DOM.chatMessages.appendChild(msgEl);
    scrollToBottom();

    return msgEl;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMarkdown(text) {
    // Simple markdown formatting
    let html = escapeHtml(text);

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<div class="code-block-wrapper"><pre><code class="language-${lang}">${code.trim()}</code></pre><button class="copy-code-btn" onclick="copyCode(this)">Copy</button></div>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}

function scrollToBottom() {
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

// ===== Copy code helper =====
window.copyCode = function(btn) {
    const code = btn.previousElementSibling.textContent;
    navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
    });
};

// ===== Send Message =====
async function sendMessage() {
    const content = DOM.userInput.value.trim();
    if (!content || state.isStreaming) return;

    // Validate
    if (!state.apiKey) {
        addMessage('error', 'Please enter your API key in the settings panel.');
        return;
    }
    if (!state.model) {
        addMessage('error', 'Please select a model in the settings panel.');
        return;
    }

    // Add user message
    state.messages.push({ role: 'user', content });
    addMessage('user', content);

    // Clear input
    DOM.userInput.value = '';
    DOM.userInput.dispatchEvent(new Event('input'));

    // Build messages array
    const messages = [];
    const systemPrompt = DOM.systemPrompt.value.trim();
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push(...state.messages);

    // Get parameters
    const params = {
        temperature: parseFloat(DOM.temperatureSlider.value),
        maxTokens: parseInt(DOM.maxTokensInput.value),
        topP: parseFloat(DOM.topPSlider.value)
    };

    const useStream = DOM.streamToggle.checked;
    const provider = PROVIDERS[state.provider];

    // Show thinking indicator
    const assistantEl = addMessage('assistant', '');
    const textEl = assistantEl.querySelector('.message-text');
    const metaEl = assistantEl.querySelector('.message-meta');
    textEl.innerHTML = '<div class="thinking-indicator"><span></span><span></span><span></span></div>';

    // Swap send button to stop
    setSendingState(true);

    const startTime = performance.now();
    let ttfb = null;
    let fullContent = '';

    try {
        state.abortController = new AbortController();

        // Build URL
        let url;
        if (provider.getUrl) {
            url = provider.getUrl(provider.baseUrl, state.model, state.apiKey, useStream);
        } else {
            url = state.provider === 'custom'
                ? DOM.customEndpoint.value.trim() || provider.baseUrl
                : provider.baseUrl;
        }

        const headers = provider.headers(state.apiKey);
        const body = provider.buildBody(messages, state.model, params, useStream);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: state.abortController.signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(errorMsg);
        }

        if (useStream && response.body) {
            // Streaming
            fullContent = await handleStream(response, provider.parseStream, textEl, startTime, (t) => { ttfb = t; });
        } else {
            // Non-streaming
            ttfb = performance.now() - startTime;
            const data = await response.json();
            const parsed = provider.parseResponse(data);
            fullContent = parsed.content;
            textEl.innerHTML = formatMarkdown(fullContent);

            // Update token stats
            if (parsed.usage) {
                updateResponseStats({
                    latency: performance.now() - startTime,
                    ttfb,
                    tokensIn: parsed.usage.prompt_tokens || 0,
                    tokensOut: parsed.usage.completion_tokens || 0
                });
            }
        }

        // Store assistant message
        state.messages.push({ role: 'assistant', content: fullContent });

        // Final stats
        const endTime = performance.now();
        const latency = endTime - startTime;
        const tokensOut = estimateTokens(fullContent);
        const tokensIn = estimateTokens(messages.map(m => m.content).join(' '));

        if (useStream) {
            updateResponseStats({ latency, ttfb, tokensIn, tokensOut });
        }

        // Meta display
        metaEl.innerHTML = `
            <span>⏱ ${formatLatency(latency)}</span>
            <span>📥 ~${tokensIn} tokens</span>
            <span>📤 ~${tokensOut} tokens</span>
        `;

        // Add to session
        state.session.messageCount += 2;
        state.session.totalTokens += tokensIn + tokensOut;
        state.session.latencies.push(latency);

        const modelInfo = provider.models.find(m => m.id === state.model);
        if (modelInfo) {
            const cost = (tokensIn * modelInfo.inputCost / 1000000) + (tokensOut * modelInfo.outputCost / 1000000);
            state.session.totalCost += cost;
        }

        // Add to history
        addToHistory(fullContent, latency, tokensOut);
        updateSessionStats();

        // Add copy-code handlers
        assistantEl.querySelectorAll('.copy-code-btn').forEach(btn => {
            btn.addEventListener('click', () => copyCode(btn));
        });

    } catch (err) {
        if (err.name === 'AbortError') {
            textEl.innerHTML = formatMarkdown(fullContent || '*(Generation stopped)*');
            if (fullContent) {
                state.messages.push({ role: 'assistant', content: fullContent });
            }
        } else {
            textEl.innerHTML = '';
            assistantEl.remove();
            addMessage('error', err.message);
        }
    } finally {
        setSendingState(false);
        state.abortController = null;
    }
}

// ===== Stream Handlers =====
async function handleStream(response, parseType, textEl, startTime, onTTFB) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';
    let firstChunkReceived = false;

    textEl.innerHTML = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process SSE lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                const data = line.slice(5).trim();

                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    let chunk = '';

                    if (parseType === 'openai') {
                        chunk = parsed.choices?.[0]?.delta?.content || '';
                    } else if (parseType === 'anthropic') {
                        if (parsed.type === 'content_block_delta') {
                            chunk = parsed.delta?.text || '';
                        }
                    } else if (parseType === 'google') {
                        chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    }

                    if (chunk) {
                        if (!firstChunkReceived) {
                            firstChunkReceived = true;
                            onTTFB(performance.now() - startTime);
                        }
                        fullContent += chunk;
                        textEl.innerHTML = formatMarkdown(fullContent) + '<span class="streaming-cursor"></span>';
                        scrollToBottom();
                    }
                } catch (e) {
                    // Skip unparseable chunks
                }
            }
        }
    } catch (e) {
        if (e.name !== 'AbortError') throw e;
    }

    // Remove cursor and finalize
    textEl.innerHTML = formatMarkdown(fullContent);
    return fullContent;
}

// ===== Stats Updates =====
function updateResponseStats({ latency, ttfb, tokensIn, tokensOut }) {
    DOM.statLatency.textContent = formatLatency(latency);
    DOM.statTTFB.textContent = ttfb !== null ? formatLatency(ttfb) : '—';
    DOM.statTokensIn.textContent = tokensIn?.toLocaleString() || '—';
    DOM.statTokensOut.textContent = tokensOut?.toLocaleString() || '—';

    // Speed: tokens per second
    if (tokensOut && latency) {
        const speed = (tokensOut / (latency / 1000)).toFixed(1);
        DOM.statSpeed.textContent = `${speed} t/s`;
    }

    // Cost estimate
    const provider = PROVIDERS[state.provider];
    const modelInfo = provider.models.find(m => m.id === state.model);
    if (modelInfo && tokensIn && tokensOut) {
        const cost = (tokensIn * modelInfo.inputCost / 1000000) + (tokensOut * modelInfo.outputCost / 1000000);
        DOM.statCost.textContent = cost < 0.01 ? `$${cost.toFixed(6)}` : `$${cost.toFixed(4)}`;
    }
}

function updateSessionStats() {
    DOM.sessionMessages.textContent = state.session.messageCount;
    DOM.sessionTokens.textContent = state.session.totalTokens.toLocaleString();
    DOM.sessionCost.textContent = state.session.totalCost < 0.01
        ? `$${state.session.totalCost.toFixed(6)}`
        : `$${state.session.totalCost.toFixed(4)}`;

    if (state.session.latencies.length > 0) {
        const avg = state.session.latencies.reduce((a, b) => a + b, 0) / state.session.latencies.length;
        DOM.sessionAvgLatency.textContent = formatLatency(avg);
    }
}

function addToHistory(content, latency, tokens) {
    // Clear empty state
    const emptyState = DOM.responseHistory.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const item = document.createElement('div');
    item.className = 'history-item';

    const modelInfo = PROVIDERS[state.provider].models.find(m => m.id === state.model);
    const modelName = modelInfo?.name || state.model;
    const preview = content.substring(0, 60).replace(/\n/g, ' ');

    item.innerHTML = `
        <div class="history-model">${modelName}</div>
        <div class="history-preview">${escapeHtml(preview)}...</div>
        <div class="history-stats">
            <span>${formatLatency(latency)}</span>
            <span>~${tokens} tok</span>
        </div>
    `;

    DOM.responseHistory.prepend(item);

    // Keep max 20 items
    const items = DOM.responseHistory.querySelectorAll('.history-item');
    if (items.length > 20) items[items.length - 1].remove();
}

// ===== Utility Functions =====
function formatLatency(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function estimateTokens(text) {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil((text || '').length / 4);
}

function setSendingState(isSending) {
    state.isStreaming = isSending;
    DOM.userInput.disabled = isSending;

    if (isSending) {
        // Replace send button with stop button
        DOM.btnSend.className = 'btn-stop';
        DOM.btnSend.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
        `;
        DOM.btnSend.disabled = false;
        DOM.btnSend.onclick = () => {
            if (state.abortController) {
                state.abortController.abort();
            }
        };
    } else {
        // Restore send button
        DOM.btnSend.className = 'btn-send';
        DOM.btnSend.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
        `;
        DOM.btnSend.disabled = !DOM.userInput.value.trim();
        DOM.btnSend.onclick = sendMessage;
        DOM.userInput.focus();
    }
}

// ===== Create Welcome Screen (for recreation after clear) =====
function createWelcomeScreen() {
    const div = document.createElement('div');
    div.id = 'welcome-screen';
    div.className = 'welcome-screen';
    div.innerHTML = `
        <div class="welcome-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect x="8" y="8" width="48" height="48" rx="12" stroke="url(#wg2)" stroke-width="2" fill="url(#wg2)" fill-opacity="0.05"/>
                <path d="M24 28h16M24 36h10" stroke="url(#wg2)" stroke-width="2" stroke-linecap="round"/>
                <circle cx="44" cy="44" r="10" fill="url(#wg2)" fill-opacity="0.15" stroke="url(#wg2)" stroke-width="2"/>
                <path d="M42 42l4 4M42 46l4-4" stroke="url(#wg2)" stroke-width="2" stroke-linecap="round"/>
                <defs><linearGradient id="wg2" x1="8" y1="8" x2="56" y2="56"><stop stop-color="#818cf8"/><stop offset="1" stop-color="#c084fc"/></linearGradient></defs>
            </svg>
        </div>
        <h2>Welcome to AI Playground</h2>
        <p>Configure your API key and model in the settings panel, then start chatting.</p>
        <div class="quick-prompts">
            <button class="quick-prompt" data-prompt="Explain quantum computing in simple terms">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Explain quantum computing
            </button>
            <button class="quick-prompt" data-prompt="Write a Python function to sort a list using merge sort with detailed comments">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                Write a merge sort
            </button>
            <button class="quick-prompt" data-prompt="Compare REST vs GraphQL APIs with pros and cons">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                REST vs GraphQL
            </button>
            <button class="quick-prompt" data-prompt="Write a creative short story about an AI that discovers emotions">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                Creative short story
            </button>
        </div>
    `;

    // Bind quick prompt events
    div.querySelectorAll('.quick-prompt').forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.userInput.value = btn.dataset.prompt;
            DOM.userInput.dispatchEvent(new Event('input'));
            DOM.userInput.focus();
        });
    });

    return div;
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', init);
