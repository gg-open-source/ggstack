import { component$, useSignal } from "@builder.io/qwik";

export const App = component$(() => {
  const count = useSignal(0);

  return (
    <div>
      <h1>{"{{APP_NAME}}"}</h1>
      <div class="card">
        <button type="button" onClick$={() => count.value++}>
          count is {count.value}
        </button>
      </div>
    </div>
  );
});
