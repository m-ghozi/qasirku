import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NumberInput from '@/components/NumberInput';

describe('NumberInput — mode integer', () => {
  it('menampilkan nilai berformat ribuan id-ID', () => {
    render(<NumberInput value="10000" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('10.000');
  });

  it('onChange mengirim digit murni (buang non-digit)', () => {
    const onChange = vi.fn();
    render(<NumberInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1a2.b3' } });
    expect(onChange).toHaveBeenCalledWith('123');
  });

  it('nilai kosong → tampilan kosong', () => {
    render(<NumberInput value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });
});

describe('NumberInput — mode decimal', () => {
  it('menampilkan dot-decimal sebagai format id-ID (1.5 → 1,5)', () => {
    render(<NumberInput value="1.5" onChange={() => {}} decimal />);
    expect(screen.getByRole('textbox')).toHaveValue('1,5');
  });

  it('mem-parse input id-ID → raw dot-decimal (1.234,5 → 1234.5)', () => {
    const onChange = vi.fn();
    render(<NumberInput value="" onChange={onChange} decimal />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1.234,5' } });
    expect(onChange).toHaveBeenCalledWith('1234.5');
  });

  it('mempertahankan koma trailing saat mengetik (12, → 12.)', () => {
    const onChange = vi.fn();
    render(<NumberInput value="" onChange={onChange} decimal />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '12,' } });
    expect(onChange).toHaveBeenCalledWith('12.');
  });
});
