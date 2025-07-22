import { ApiConversation } from '../types/conversation';

const API_BASE_URL = 'http://localhost:3000';

export const api = {
  async getConversations(year?: number): Promise<ApiConversation[]> {
    const url = year 
      ? `${API_BASE_URL}/conversations?updatedAtYear=${year}`
      : `${API_BASE_URL}/conversations`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Unexpected API response');
    }
    
    return data;
  },

  async getConversationPosts(conversationId: string): Promise<ApiConversation[]> {
    const fullConversationId = conversationId?.startsWith('CONVO#') 
      ? conversationId 
      : `CONVO#${conversationId}`;

    const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(fullConversationId)}/posts`);
    if (!response.ok) {
      throw new Error(`Failed to fetch conversation: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format: expected an array of posts');
    }
    
    return data;
  },

  async createConversation(conversation: {
    type: string;
    title: string;
    author: string;
    messageBody: string;
  }): Promise<ApiConversation> {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(conversation),
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
};
