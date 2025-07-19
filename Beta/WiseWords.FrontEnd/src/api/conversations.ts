// Conversations API service
export interface Conversation {
  NewGuid: string;
  ConvoType: number;
  Title: string;
  Author: string;
  UtcCreationTime: string;
}

export async function fetchConversationsByYear(year: number): Promise<Conversation[]> {
  const response = await fetch(
    `/conversations?updatedAtYear=${year}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.status}`);
  }
  return response.json();
}
