# Gerando Ícones para PWA

## Opção 1: Usar ferramenta online (mais fácil)

1. Acesse: https://www.pwabuilder.com/imageGenerator
2. Faça upload do arquivo `public/icons/icon.svg`
3. Baixe o pacote de ícones
4. Extraia na pasta `public/icons/`

## Opção 2: Usar o Figma

1. Abra o Figma
2. Crie um frame 512x512
3. Adicione um retângulo com cantos arredondados (108px)
4. Preencha com gradiente: #FF3B30 → #FF6347
5. Adicione texto "I" centralizado, Inter Black, 280px, branco
6. Exporte em vários tamanhos: 72, 96, 128, 144, 152, 192, 384, 512

## Opção 3: Usar ImageMagick (linha de comando)

```bash
# Instalar ImageMagick
# Mac: brew install imagemagick
# Ubuntu: sudo apt install imagemagick

# Converter SVG para PNGs
convert public/icons/icon.svg -resize 72x72 public/icons/icon-72x72.png
convert public/icons/icon.svg -resize 96x96 public/icons/icon-96x96.png
convert public/icons/icon.svg -resize 128x128 public/icons/icon-128x128.png
convert public/icons/icon.svg -resize 144x144 public/icons/icon-144x144.png
convert public/icons/icon.svg -resize 152x152 public/icons/icon-152x152.png
convert public/icons/icon.svg -resize 192x192 public/icons/icon-192x192.png
convert public/icons/icon.svg -resize 384x384 public/icons/icon-384x384.png
convert public/icons/icon.svg -resize 512x512 public/icons/icon-512x512.png
```

## Tamanhos necessários:

| Tamanho | Uso |
|---------|-----|
| 72x72 | Android (ldpi) |
| 96x96 | Android (mdpi) |
| 128x128 | Chrome Web Store |
| 144x144 | Android (hdpi) |
| 152x152 | iPad |
| 192x192 | Android (xxhdpi), iOS |
| 384x384 | Android (xxxhdpi) |
| 512x512 | Google Play, Splash |
