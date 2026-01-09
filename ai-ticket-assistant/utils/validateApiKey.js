import fetch from "node-fetch";

export async function validateApiKey() {
  try {
    console.log('🔍 Validating AssemblyAI API key...');
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'GET',
      headers: {
        'Authorization': process.env.ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (response.status === 401) {
      console.error(' Invalid AssemblyAI API Key');
      return false;
    } else if (response.status === 403) {
      console.error(' AssemblyAI API Key lacks permissions');
      return false;
    } else if (response.ok) {
      console.log(' AssemblyAI API Key is valid');
      return true;
    }
  } catch (error) {
    console.error(' API Key validation failed:', error.message);
    return false;
  }
}
