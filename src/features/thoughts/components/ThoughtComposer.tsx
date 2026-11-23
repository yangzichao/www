import { EMPTY_THOUGHT_DRAFT, ThoughtForm } from './ThoughtForm';
import { postThought } from './thoughts-api';
import { reloadPage } from './reload-page';

export default function ThoughtComposer() {
  return (
    <div className="thought-composer">
      <ThoughtForm
        initialDraft={EMPTY_THOUGHT_DRAFT}
        bodyLabel="New thought"
        submitLabel="Post"
        submittingLabel="Posting…"
        failureMessage="Could not post this thought."
        clearAfterSubmit
        onSubmit={async (submission) => {
          await postThought(submission);
          reloadPage();
        }}
      />
    </div>
  );
}
