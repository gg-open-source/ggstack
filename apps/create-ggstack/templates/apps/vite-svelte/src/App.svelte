<script lang="ts">
  let count = $state(0);
</script>

<div>
  <h1>{{APP_NAME}}</h1>
  <div class="card">
    <button type="button" onclick={() => count++}>count is {count}</button>
  </div>
</div>
