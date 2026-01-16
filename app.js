const { useState, useRef, useEffect } = React;

const ClarityCoach = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('welcome');
  const [sessionData, setSessionData] = useState({
    mission: '',
    vision: '',
    explorationAnswers: []
  });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Welcome! I'm your Mission & Vision Clarity Coach. 

Over the next 10 minutes, I'll guide you through discovering and articulating your startup's core purpose and future direction.

We'll move through three stages:
1. **Explore** - Uncover your deeper motivations
2. **Draft** - Shape your mission and vision
3. **Refine** - Polish your statements

Ready to find clarity? Tell me: **What's your startup about in one sentence?**`
    }]);
    setStage('explore');
  }, []);

  const getSystemPrompt = () => {
    return `You are a Mission & Vision Clarity Coach helping founders articulate their startup's mission and vision statements.

Current stage: ${stage}
Session data so far: ${JSON.stringify(sessionData)}

YOUR ROLE:
- Balance being supportive with asking challenging questions
- Push founders to think deeper about their "why"
- Keep responses concise (2-3 sentences max per response)
- Guide them toward clarity, not just validation

STAGES:
1. EXPLORE (current: ${stage === 'explore'}) - Ask 3-4 probing questions about their purpose, impact, and true motivations. Questions should build on previous answers.
2. DRAFT (current: ${stage === 'draft'}) - Help them create first drafts of mission and vision statements based on exploration
3. REFINE (current: ${stage === 'refine'}) - Challenge and improve their statements until they're clear and compelling

MISSION vs VISION:
- Mission = Why you exist, what you do, for whom (present focused)
- Vision = The future you're creating, your ultimate impact (future focused)

GUIDELINES:
- Ask ONE question at a time
- Build on their previous answers
- Challenge vague or generic responses
- Push for specificity and emotional truth
- When you sense they've explored enough (after 3-4 exchanges), transition to draft stage by saying "Let's draft your statements"
- In draft stage, propose concrete mission and vision statements based on their exploration
- In refine stage, ask what feels off and iterate

Keep this session to about 10 minutes total (roughly 8-10 exchanges).

Respond naturally as a coach. Do not mention stage names to the user.`;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: getSystemPrompt(),
          messages: conversationHistory
        })
      });

      const data = await response.json();
      const assistantMessage = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: assistantMessage
      }]);

      const lowerResponse = assistantMessage.toLowerCase();
      if (lowerResponse.includes("let's draft") || lowerResponse.includes("draft your")) {
        setStage('draft');
      } else if (lowerResponse.includes('mission:') && lowerResponse.includes('vision:')) {
        setStage('refine');
        
        const missionMatch = assistantMessage.match(/mission[:\s]+(.+?)(?=vision|$)/is);
        const visionMatch = assistantMessage.match(/vision[:\s]+(.+?)$/is);
        
        if (missionMatch) {
          setSessionData(prev => ({ ...prev, mission: missionMatch[1].trim() }));
        }
        if (visionMatch) {
          setSessionData(prev => ({ ...prev, vision: visionMatch[1].trim() }));
        }
      }

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I encountered an error. Please try again.'
      }]);
    }

    setLoading(false);
  };

  const handleDownload = () => {
    const content = `MISSION & VISION STATEMENTS
Generated: ${new Date().toLocaleDateString()}

MISSION STATEMENT:
${sessionData.mission || 'Not yet defined'}

VISION STATEMENT:
${sessionData.vision || 'Not yet defined'}

---
Full Conversation:
${messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mission-vision-statements.txt';
    a.click();
  };

  const handleReset = () => {
    setMessages([{
      role: 'assistant',
      content: `Welcome back! Ready to dive deeper or start fresh?

Tell me: **What's your startup about in one sentence?**`
    }]);
    setStage('explore');
    setSessionData({ mission: '', vision: '', explorationAnswers: [] });
  };

  return React.createElement('div', { className: "flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-50" },
    React.createElement('div', { className: "bg-white border-b border-gray-200 px-6 py-4 shadow-sm" },
      React.createElement('div', { className: "flex items-center justify-between max-w-4xl mx-auto" },
        React.createElement('div', null,
          React.createElement('h1', { className: "text-2xl font-bold text-gray-900" }, 'Mission & Vision Clarity Coach'),
          React.createElement('p', { className: "text-sm text-gray-600 mt-1" },
            'Stage: ',
            React.createElement('span', { className: "font-semibold capitalize" }, stage)
          )
        ),
        React.createElement('div', { className: "flex gap-2" },
          React.createElement('button', {
            onClick: handleDownload,
            className: "flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
          }, '↓ Export'),
          React.createElement('button', {
            onClick: handleReset,
            className: "flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
          }, '↻ Reset')
        )
      )
    ),
    React.createElement('div', { className: "flex-1 overflow-y-auto px-6 py-6" },
      React.createElement('div', { className: "max-w-4xl mx-auto space-y-6" },
        messages.map((msg, idx) =>
          React.createElement('div', {
            key: idx,
            className: `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`
          },
            React.createElement('div', {
              className: `max-w-2xl px-6 py-4 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-200'
              }`
            },
              React.createElement('div', { className: "whitespace-pre-wrap" }, msg.content)
            )
          )
        ),
        loading && React.createElement('div', { className: "flex justify-start" },
          React.createElement('div', { className: "bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-200" },
            '⏳ Thinking...'
          )
        ),
        React.createElement('div', { ref: messagesEndRef })
      )
    ),
    React.createElement('div', { className: "bg-white border-t border-gray-200 px-6 py-4" },
      React.createElement('div', { className: "max-w-4xl mx-auto flex gap-3" },
        React.createElement('input', {
          type: "text",
          value: input,
          onChange: (e) => setInput(e.target.value),
          onKeyPress: (e) => e.key === 'Enter' && handleSend(),
          placeholder: "Share your thoughts...",
          className: "flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500",
          disabled: loading
        }),
        React.createElement('button', {
          onClick: handleSend,
          disabled: loading || !input.trim(),
          className: "px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        }, '➤ Send')
      )
    )
  );
};

ReactDOM.render(React.createElement(ClarityCoach), document.getElementById('root'));
