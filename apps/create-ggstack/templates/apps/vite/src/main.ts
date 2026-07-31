import "./style.css";

function setupCounter(element: HTMLButtonElement) {
  let counter = 0;
  const setCounter = (count: number) => {
    counter = count;
    element.innerHTML = `count is ${counter}`;
  };
  element.addEventListener("click", () => setCounter(counter + 1));
  setCounter(0);
}

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `
    <div>
      <h1>{{APP_NAME}}</h1>
      <div class="card">
        <button id="counter" type="button"></button>
      </div>
    </div>
  `;
  setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
}
