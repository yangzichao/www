import stylelint from 'stylelint';
import { isAllowedComment, NO_COMMENTS_MESSAGE } from './allowed-comment.mjs';

const RULE_NAME = 'local/no-comments';

const messages = stylelint.utils.ruleMessages(RULE_NAME, { comment: NO_COMMENTS_MESSAGE });

function noCommentsRule(enabled) {
  return (root, result) => {
    if (!enabled) return;
    root.walkComments((comment) => {
      const rawText = comment.toString();
      const classified = {
        text: comment.text,
        isDocBlock: rawText.startsWith('/**'),
        isLicenseBlock: rawText.startsWith('/*!'),
      };
      if (isAllowedComment(classified)) return;
      stylelint.utils.report({ ruleName: RULE_NAME, result, node: comment, message: messages.comment });
    });
  };
}

noCommentsRule.ruleName = RULE_NAME;
noCommentsRule.messages = messages;

export default stylelint.createPlugin(RULE_NAME, noCommentsRule);
