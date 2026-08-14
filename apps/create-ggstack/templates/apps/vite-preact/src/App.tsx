import { useState } from "preact/hooks";

export function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>{"{{APP_NAME}}"}</h1>
      <div class="card">
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          count is {count}
        </button>
      </div>
    </div>
  );
}
