import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchableSelect, { type SearchableOption } from '@/components/SearchableSelect';

const options: SearchableOption[] = [
  { value: '1', label: 'Kopi Susu' },
  { value: '2', label: 'Teh Tarik' },
  { value: '3', label: 'Es Jeruk' },
];

describe('SearchableSelect', () => {
  it('menampilkan placeholder saat belum ada pilihan', () => {
    render(<SearchableSelect options={options} value="" onChange={() => {}} placeholder="Pilih produk" />);
    expect(screen.getByText('Pilih produk')).toBeInTheDocument();
  });

  it('menampilkan label dari value terpilih', () => {
    render(<SearchableSelect options={options} value="2" onChange={() => {}} />);
    expect(screen.getByText('Teh Tarik')).toBeInTheDocument();
  });

  it('membuka dropdown & memfilter berdasarkan query', () => {
    render(<SearchableSelect options={options} value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getByPlaceholderText('Cari...'), { target: { value: 'teh' } });
    expect(screen.getByText('Teh Tarik')).toBeInTheDocument();
    expect(screen.queryByText('Kopi Susu')).not.toBeInTheDocument();
  });

  it('menampilkan "Tidak ditemukan" bila tak ada match', () => {
    render(<SearchableSelect options={options} value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getByPlaceholderText('Cari...'), { target: { value: 'zzz' } });
    expect(screen.getByText('Tidak ditemukan')).toBeInTheDocument();
  });

  it('memilih opsi → onChange dengan value & menutup dropdown', () => {
    const onChange = vi.fn();
    render(<SearchableSelect options={options} value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Es Jeruk'));
    expect(onChange).toHaveBeenCalledWith('3');
    expect(screen.queryByPlaceholderText('Cari...')).not.toBeInTheDocument();
  });
});
