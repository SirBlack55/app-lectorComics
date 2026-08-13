# Lector Comics PWA

PWA pensada para iPhone, Android, tablets y web. Se desarrolla desde Windows y no depende de Expo Go ni de Mac para usarla como app instalable.

## Que hace esta base

- Importa `PDF`
- Importa `CBZ`
- Importa varias imagenes como un comic
- Guarda la biblioteca en `IndexedDB`
- Recuerda la pagina actual
- Se puede instalar en iPhone desde Safari con `Anadir a pantalla de inicio`
- Se puede instalar en Android desde Chrome con `Instalar app` o `Anadir a pantalla de inicio`
- Se adapta a movil, tablet y escritorio, en vertical y horizontal

## Stack

- `React`
- `Vite`
- `vite-plugin-pwa`
- `JSZip`
- `pdfjs-dist`
- `page-flip`

## Arranque local

```bash
npm install
npm run dev
```

La app arrancara en:

```bash
http://localhost:4173
```

## Como probarla en movil o tablet

1. Ejecuta `npm run dev`
2. Asegurate de que el movil/tablet y el PC esten en la misma Wi-Fi
3. Abre en el dispositivo la URL local que te muestre Vite, normalmente `http://TU-IP-LOCAL:4173`
4. En iPhone, usa Safari y pulsa `Anadir a pantalla de inicio`
5. En Android, usa Chrome y pulsa `Instalar app` o `Anadir a pantalla de inicio`

No uses Live Server para esta app: Vite es quien transforma React/TypeScript y sirve los modulos con el MIME correcto.

## Limites actuales

- El almacenamiento depende del navegador
- Los `PDF` se convierten a imagenes al importarlos, lo que puede tardar algo mas en archivos grandes
- Las paginas se guardan como `data URL`, suficiente para un MVP personal pero mejorable para bibliotecas grandes

## Siguiente paso recomendado

- optimizar almacenamiento para comics grandes
- modo lectura vertical continua
- zoom y gesto mas refinados para iPhone
