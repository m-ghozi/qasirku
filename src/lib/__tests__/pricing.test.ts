import { describe, it, expect } from 'vitest';
import {
    marginPercent,
    priceFromMarginPercent,
    marginToInputValue,
    formatMargin,
} from '@/lib/pricing';

describe('marginPercent — margin atas harga jual', () => {
    it('menghitung margin dari harga jual & HPP', () => {
        expect(marginPercent(15000, 10000)).toBeCloseTo(33.333, 3);
        expect(marginPercent(20000, 10000)).toBe(50);
        expect(marginPercent(10000, 10000)).toBe(0);
    });

    it('margin negatif saat harga jual di bawah HPP', () => {
        expect(marginPercent(10000, 15000)).toBe(-50);
    });

    it('null bila harga jual atau HPP belum diisi', () => {
        // HPP kosong sengaja null, bukan 100% — "biaya belum dicatat" bukan "gratis"
        expect(marginPercent(15000, 0)).toBeNull();
        expect(marginPercent(0, 10000)).toBeNull();
        expect(marginPercent(NaN, 10000)).toBeNull();
        expect(marginPercent(15000, NaN)).toBeNull();
    });
});

describe('priceFromMarginPercent — kebalikan dari marginPercent', () => {
    it('menghitung harga jual dari HPP & margin', () => {
        expect(priceFromMarginPercent(10000, 50)).toBe(20000);
        expect(priceFromMarginPercent(10000, 0)).toBe(10000);
        // dibulatkan ke rupiah terdekat
        expect(priceFromMarginPercent(10000, 33.3)).toBe(14993);
    });

    it('bolak-balik harga → margin → harga kembali ke angka semula', () => {
        const price = 15000;
        const hpp = 10000;
        const back = priceFromMarginPercent(hpp, marginPercent(price, hpp)!);
        expect(back).toBe(price);
    });

    it('null bila HPP belum diisi atau margin mustahil', () => {
        expect(priceFromMarginPercent(0, 50)).toBeNull();
        expect(priceFromMarginPercent(10000, 100)).toBeNull(); // harga tak terhingga
        expect(priceFromMarginPercent(10000, 120)).toBeNull();
        expect(priceFromMarginPercent(10000, NaN)).toBeNull();
    });
});

describe('marginToInputValue', () => {
    it('membulatkan ke satu angka desimal gaya dot-decimal', () => {
        expect(marginToInputValue(33.333333333333336)).toBe('33.3');
        expect(marginToInputValue(50)).toBe('50');
        expect(marginToInputValue(-50)).toBe('-50');
        expect(marginToInputValue(0)).toBe('0');
    });

    it("string kosong bila margin tidak diketahui", () => {
        expect(marginToInputValue(null)).toBe('');
    });
});

describe('formatMargin', () => {
    it('memakai koma sebagai pemisah desimal', () => {
        expect(formatMargin(33.3333)).toBe('33,3%');
        expect(formatMargin(0)).toBe('0,0%');
        expect(formatMargin(-50)).toBe('-50,0%');
    });

    it('tanda hubung bila margin tidak diketahui', () => {
        expect(formatMargin(null)).toBe('-');
    });
});
