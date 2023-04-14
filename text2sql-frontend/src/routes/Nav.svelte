<script>
  import { page } from "$app/stores";
</script>

<nav class="navbar navbar-light">
  <div class="container">
    <a class="navbar-brand" href="/">Text2SQL</a>
    <ul class="nav navbar-nav pull-xs-right">
      <li class="nav-item">
        <a class="nav-link" class:active={$page.url.pathname === "/"} href="/"
          >Home</a
        >
      </li>

      {#if $page.data.user}{:else}{/if}
    </ul>
  </div>
</nav>
