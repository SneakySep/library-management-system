import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

function DebounceTester({ value, delay }: { value: string; delay: number }) {
  const debounced = useDebounce(value, delay);
  return <span data-testid="debounced">{debounced}</span>;
}

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { getByTestId } = render(<DebounceTester value="hello" delay={300} />);
    expect(getByTestId('debounced').textContent).toBe('hello');
  });

  it('should debounce value changes', () => {
    const { getByTestId, rerender } = render(
      <DebounceTester value="hello" delay={300} />,
    );

    expect(getByTestId('debounced').textContent).toBe('hello');

    rerender(<DebounceTester value="world" delay={300} />);
    expect(getByTestId('debounced').textContent).toBe('hello');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(getByTestId('debounced').textContent).toBe('world');
  });

  it('should reset timer on rapid changes', () => {
    const { getByTestId, rerender } = render(
      <DebounceTester value="a" delay={300} />,
    );

    rerender(<DebounceTester value="b" delay={300} />);
    rerender(<DebounceTester value="c" delay={300} />);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(getByTestId('debounced').textContent).toBe('a');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(getByTestId('debounced').textContent).toBe('c');
  });
});
