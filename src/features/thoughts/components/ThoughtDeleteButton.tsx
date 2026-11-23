import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { describeError } from '../../http/describe-error';
import { deleteThoughtById } from './thoughts-api';
import { reloadPage } from './reload-page';
import './thoughts-admin.css';

interface ThoughtDeleteButtonProps {
  thoughtId: string;
}

type DeleteStep = 'idle' | 'confirming' | 'deleting';

export default function ThoughtDeleteButton({ thoughtId }: ThoughtDeleteButtonProps) {
  const [step, setStep] = useState<DeleteStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function deleteThought() {
    setStep('deleting');
    setErrorMessage(null);
    try {
      await deleteThoughtById(thoughtId);
      reloadPage();
    } catch (error) {
      setErrorMessage(describeError(error, 'Could not delete this thought.'));
      setStep('idle');
    }
  }

  function handleClick() {
    if (step === 'idle') setStep('confirming');
    else if (step === 'confirming') void deleteThought();
  }

  const labelByStep: Record<DeleteStep, string> = {
    idle: 'Delete',
    confirming: 'Click again to delete',
    deleting: 'Deleting…',
  };

  return (
    <span className="thought-delete">
      <Button
        type="button"
        variant={step === 'confirming' ? 'destructive' : 'ghost'}
        size="xs"
        className="thought-delete-button"
        data-step={step}
        disabled={step === 'deleting'}
        onClick={handleClick}
        onBlur={() => {
          if (step === 'confirming') setStep('idle');
        }}
      >
        {labelByStep[step]}
      </Button>
      {errorMessage && (
        <span className="thought-form-error" role="alert">
          {errorMessage}
        </span>
      )}
    </span>
  );
}
