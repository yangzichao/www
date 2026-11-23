import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PostDeleteButtonProps {
  disabled: boolean;
  onConfirmedDelete: () => void;
}

export function PostDeleteButton({ disabled, onConfirmedDelete }: PostDeleteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <Button
      type="button"
      variant={isConfirming ? 'destructive' : 'ghost'}
      disabled={disabled}
      onClick={() => {
        if (isConfirming) onConfirmedDelete();
        else setIsConfirming(true);
      }}
      onBlur={() => {
        setIsConfirming(false);
      }}
    >
      {isConfirming ? 'Click again to delete' : 'Delete'}
    </Button>
  );
}
