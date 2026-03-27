const WS_URL = 'wss://hey8o0q9tb.execute-api.ap-southeast-1.amazonaws.com/production';

/**
 * WebSocket client for live meeting sessions.
 * Manages connection lifecycle, message routing, and reconnection.
 */
export class MeetingSocket {
  constructor({ sessionId, agentId, onMessage, onOpen, onClose, onError }) {
    this.sessionId = sessionId;
    this.agentId = agentId;
    this.onMessage = onMessage || (() => {});
    this.onOpen = onOpen || (() => {});
    this.onClose = onClose || (() => {});
    this.onError = onError || (() => {});
    this.ws = null;
    this._reconnectAttempts = 0;
    this._maxReconnects = 5;
    this._reconnectDelay = 2000;
    this._intentionalClose = false;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    let url = `${WS_URL}?session_id=${this.sessionId}`;
    if (this.agentId) url += `&agent_id=${this.agentId}`;

    this.ws = new WebSocket(url);
    this._intentionalClose = false;

    this.ws.onopen = () => {
      this._reconnectAttempts = 0;
      this.onOpen();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage(data);
      } catch {
        console.error('WebSocket: failed to parse message', event.data);
      }
    };

    this.ws.onclose = (event) => {
      this.onClose(event);
      if (!this._intentionalClose && this._reconnectAttempts < this._maxReconnects) {
        this._reconnectAttempts++;
        const delay = this._reconnectDelay * this._reconnectAttempts;
        console.log(`WebSocket: reconnecting in ${delay}ms (attempt ${this._reconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
      }
    };

    this.ws.onerror = (event) => {
      this.onError(event);
    };
  }

  send(action, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket: not connected');
      return false;
    }
    this.ws.send(JSON.stringify({ action, ...payload }));
    return true;
  }

  // --- Action helpers ---

  sendMessage(sessionId, message) {
    return this.send('sendMessage', { session_id: sessionId, message });
  }

  detectQuestion(sessionId, question) {
    return this.send('detectQuestion', { session_id: sessionId, question });
  }

  extractQAPair(sessionId, question, answer) {
    return this.send('extractQAPair', { session_id: sessionId, question, answer });
  }

  analyzeGaps(sessionId) {
    return this.send('analyzeGaps', { session_id: sessionId });
  }

  setSuggestedQuestions(sessionId, questions) {
    return this.send('setSuggestedQuestions', { session_id: sessionId, questions });
  }

  processTranscript(sessionId, lines) {
    return this.send('processTranscript', { session_id: sessionId, lines });
  }

  endMeeting(sessionId) {
    return this.send('endMeeting', { session_id: sessionId });
  }

  retroAnalysis(sessionId) {
    return this.send('retroAnalysis', { session_id: sessionId });
  }

  retroChat(sessionId, message) {
    return this.send('retroChat', { session_id: sessionId, message });
  }

  disconnect() {
    this._intentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
