# conectadorsalvador
LandingPage projeto de serviço de ortognatica

## Estrutura

Site estático, sem etapa de build. Os arquivos do site ficam na raiz do repositório, que é a pasta publicada pela hospedagem:

```
.
├── index.html                 página (HTML semântico, ícones em sprite SVG)
└── assets/
    ├── css/styles.css         estilos; cores e tipografia ficam nos tokens do topo do arquivo
    ├── js/main.js             cabeçalho fixo, menu do celular, player de vídeo
    ├── fonts/                 Inter e Plus Jakarta Sans servidas localmente (licença OFL)
    ├── logo.png               logomarca original
    ├── logo-160.webp, logo-320.webp, logo-320.png, favicon-*.png, apple-touch-icon.png
    │                          versões otimizadas geradas a partir de logo.png
    ├── dr-felipe.jpg          imagem original do retrato
    ├── dr-felipe-retrato.*    retrato recortado e otimizado, usado na página
    ├── poster-video.jpg       capa do vídeo (quadro do próprio vídeo, 480×854)
    └── video-dr-felipe.mp4    vídeo original, sem alterações
```

## Visualizar localmente

```bash
npx http-server . -p 4173
```

Depois abra `http://127.0.0.1:4173/`. Use um servidor que aceite requisições parciais (como o `http-server`) para o vídeo permitir avançar e voltar.

## Publicação

A Hostinger está ligada a este repositório (hPanel → Avançado → Git) e publica a branch `main` na raiz do site a cada push. Por isso o `index.html` precisa ficar na raiz do repositório: dentro de uma subpasta, o domínio responde 403.
Ao alterar `styles.css` ou `main.js`, aumente o número em `?v=` nas duas referências do `index.html` para os visitantes não ficarem com a versão antiga em cache.
