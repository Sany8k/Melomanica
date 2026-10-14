import { Button } from './Button';
import './SliderReset.css';

interface SliderResetProps {
  label: string;
  onReset: () => void;
  disabled?: boolean;
}

export function SliderReset({ label, onReset, disabled }: SliderResetProps) {
  return (
    <Button variant="outline" size="sm" className="slider-reset"
      title={`Reset: ${label}`} aria-label={`Reset: ${label}`}
      disabled={disabled} onClick={onReset}>
      Reset
    </Button>
  );
}
