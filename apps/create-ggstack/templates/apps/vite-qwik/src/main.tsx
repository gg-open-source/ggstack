import "@builder.io/qwik/qwikloader.js";
import { render } from "@builder.io/qwik";
import { App } from "./App";
import "./style.css";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Root element #app not found");
}

render(root, <App />);
