function todayInUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newPostTemplate(title: string): string {
  const quotedTitle = JSON.stringify(title);
  return `---
title: ${quotedTitle}
date: ${todayInUtc()}
description: ""
tags: []
draft: true
---

`;
}

export function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
