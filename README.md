# Pawtrait

Pawtrait is a playful web app that transforms your pet photos into 3D-style skeuomorphic icons, inspired by Airbnb's recent design exploration.

This was my first real hands-on project involving API calls and backend logic—specifically using OpenAI's GPT Image 1 API for image generation. It was also a chance to explore end-to-end app structure, including serverless deployment on Vercel.

## Technologies

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- AI: OpenAI GPT Image 1
- Deployment: Vercel
- Rate Limiting: In-memory tracking

## Rate Limiting

I'm personally covering the OpenAI API costs, so for now, the site limits each user to 3 generations per session as a courtesy cap. This limit is frontend-based only and resets on page reload or session change—it's not enforced by a database or hard user tracking.

## Run Locally

If you'd like to run Pawtrait on your own machine:

1. Clone the repository:

   ```bash
   git clone https://github.com/hencubed/pawtrait.git
   cd pawtrait
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your own OpenAI API key:

   ```bash
   OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXX
   ```

4. Start the local server:
   ```bash
   npm start
   ```

Then visit `http://localhost:3000` to test it.

## Requirements

- Node.js 18.0.0 or higher
- An OpenAI API key

## Disclaimer (Local Usage)

- The 3 generation limit will still appear in the interface, but it's only a client-side courtesy limit and won't technically stop extra generations if someone bypasses the counter.
- When running locally, all API calls are made using your own API key, and any costs will be on your account, not mine.
- The app uses simple in-memory rate limiting—there's no persistent storage or user-specific tracking.

Feel free to reach out with any questions or feedback @hencubed on X
