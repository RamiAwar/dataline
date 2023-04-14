<script>
  import { navigating } from "$app/stores";
  import Nav from "./Nav.svelte";
  import PreloadingIndicator from "./PreloadingIndicator.svelte";
  import "../app.css";
</script>

<!-- 
{#if $navigating}
  <PreloadingIndicator />
{/if} -->

<!-- <Nav /> -->

<main>
  <slot />
</main>
