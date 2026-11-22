import { isAllowedComment, NO_COMMENTS_MESSAGE } from './allowed-comment.mjs';

function classifyScriptComment(comment) {
  const isBlock = comment.type === 'Block';
  return {
    text: comment.value,
    isDocBlock: isBlock && comment.value.startsWith('*'),
    isLicenseBlock: isBlock && comment.value.startsWith('!'),
  };
}

function classifyHtmlComment(node) {
  return { text: node.value, isDocBlock: false, isLicenseBlock: false };
}

const noCommentsRule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow comments outside the AGENTS.md exception list' },
    schema: [],
    messages: { comment: NO_COMMENTS_MESSAGE },
  },
  create(context) {
    const report = (node) => context.report({ loc: node.loc, messageId: 'comment' });
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!isAllowedComment(classifyScriptComment(comment))) report(comment);
        }
      },
      AstroHTMLComment(node) {
        if (!isAllowedComment(classifyHtmlComment(node))) report(node);
      },
    };
  },
};

export default {
  meta: { name: 'local-no-comments' },
  rules: { 'no-comments': noCommentsRule },
};
