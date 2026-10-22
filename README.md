<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/09fdb129-a431-4d34-8f53-a2edbd9a2429

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Publicar no GitHub Pages

1. Envie esta pasta para um repositório no GitHub (branch `main`).
2. No repositório, vá em **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**.
3. A cada push na `main`, o workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) gera o build e publica em `https://<usuario>.github.io/<repositorio>/`.

O build usa caminhos relativos (`base: './'`), então funciona em qualquer subpasta. Os dados (agendamentos, serviços, configurações) ficam no `localStorage` do navegador de cada visitante; a sincronização de serviços usa o Supabase configurado no painel.
