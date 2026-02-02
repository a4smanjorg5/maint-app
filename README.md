# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

## Getting Started

### Prerequisites

A modern JavaScript runtime and a package manager available on your system  
(for example, a recent Node.js installation).

---

### Install

`npm install`
or
`yarn`

---

### Run in Development Mode

`npm run dev` or `yarn dev`

Open the local URL shown in the terminal to view the app.

---

### Build for Production

```bash
npm run build
```

The production-ready output will be generated in the `dist/` directory.

---

### Preview Production Build

```bash
npm run preview
```

---

## License

Licensed under the MIT License. See the `LICENSE` file for details.
