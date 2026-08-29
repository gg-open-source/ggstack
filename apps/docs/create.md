---
layout: page
title: Create
description: Build a ggstack stack visually, copy a setup command, and scaffold the same project from the terminal with --stack.
sidebar: false
aside: false
outline: false
---

<div class="create-wrap">

# Create a project

Configure your workspace in the form below. Copy the command and paste it in a terminal — `--stack` applies this exact config with no prompts.

You can also inspect a code later:

```bash
pnpm create ggstack --decode g1e30
```

<StackBuilder />

</div>

<style>
.create-wrap {
  box-sizing: border-box;
  max-width: 1120px;
  margin: 0 auto;
  padding: 48px 24px 96px;
}

.create-wrap h1 {
  margin: 0 0 8px;
  font-size: 32px;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.create-wrap > p {
  max-width: 42rem;
  margin: 0 0 20px;
  color: var(--vp-c-text-2);
  font-size: 16px;
  line-height: 1.6;
}

.create-wrap .vp-code-group,
.create-wrap div[class*="language-"] {
  margin: 0 0 28px;
  max-width: 42rem;
}

.create-wrap .markdown-copy-buttons {
  display: none;
}
</style>
