import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { montarDom, stubFetch, cargarApp } from './helpers.js';

const MSG_ERROR_CATALOGO = 'No fue posible cargar el catálogo. Por favor, recarga la página.';

const CALZADO_3 = [
  { id: 'c1', nombre: 'Zapato de vestir' },
  { id: 'c2', nombre: 'Bota' },
  { id: 'c3', nombre: 'Mocasín' },
];

describe('estado inicial del DOM (montado, sin catálogo)', () => {
  beforeEach(() => { montarDom(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('U-01: #tipo-calzado-select está disabled y tiene la opción placeholder con value="" antes de cargar el catálogo', () => {
    const select = document.getElementById('tipo-calzado-select');
    expect(select.disabled).toBe(true);
    const placeholder = select.querySelector('option[value=""]');
    expect(placeholder).toBeTruthy();
  });

  it('U-10: #resultado-cotizacion tiene aria-live="polite" presente en el DOM desde el HTML inicial', () => {
    const resultado = document.getElementById('resultado-cotizacion');
    expect(resultado.getAttribute('aria-live')).toBe('polite');
  });

  it('U-11: #mensaje-error tiene role="alert" y aria-live="assertive" en el HTML inicial', () => {
    const mensajeError = document.getElementById('mensaje-error');
    expect(mensajeError.getAttribute('role')).toBe('alert');
    expect(mensajeError.getAttribute('aria-live')).toBe('assertive');
  });

  it('U-08: #btn-cotizar tiene textContent no vacío', () => {
    const btn = document.getElementById('btn-cotizar');
    expect(btn.textContent.trim().length).toBeGreaterThan(0);
  });
});

describe('estado inicial tras cargar el catálogo con éxito', () => {
  beforeEach(() => { montarDom(); stubFetch(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('U-02: todos los checkboxes de reparación desmarcados, #btn-cotizar disabled y #resultado-cotizacion con hidden', async () => {
    await cargarApp();
    const checkboxes = document.querySelectorAll('#fs-reparaciones input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    checkboxes.forEach((chk) => expect(chk.checked).toBe(false));
    expect(document.getElementById('btn-cotizar').disabled).toBe(true);
    expect(document.getElementById('resultado-cotizacion').hasAttribute('hidden')).toBe(true);
  });

  it('U-04: cada checkbox de reparación muestra el nombre y el precioBase con 2 decimales y símbolo de moneda en el label', async () => {
    await cargarApp();
    const checkbox = document.getElementById('rep-r1');
    const label = document.querySelector('label[for="rep-r1"]');
    expect(label).toBeTruthy();
    expect(label.textContent).toContain('Cambio de suela');
    expect(label.textContent).toContain('25.50');
    expect(label.textContent).toContain('$');
    expect(checkbox).toBeTruthy();
  });

  it('U-09: cada control de formulario (select y checkboxes) tiene un label vinculado por for/id', async () => {
    await cargarApp();
    const select = document.getElementById('tipo-calzado-select');
    const labelSelect = document.querySelector(`label[for="${select.id}"]`);
    expect(labelSelect).toBeTruthy();

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    checkboxes.forEach((chk) => {
      expect(chk.id).toBeTruthy();
      const label = document.querySelector(`label[for="${chk.id}"]`);
      expect(label).toBeTruthy();
    });
  });
});

describe('U-03: renderizado del catálogo con N tipos de calzado', () => {
  beforeEach(() => { montarDom(); stubFetch({ calzado: CALZADO_3 }); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('el select contiene exactamente N+1 opciones (N ítems + placeholder)', async () => {
    await cargarApp();
    const select = document.getElementById('tipo-calzado-select');
    expect(select.options.length).toBe(CALZADO_3.length + 1);
  });
});

describe('U-05: fallo de red al cargar el catálogo', () => {
  beforeEach(() => { montarDom(); stubFetch({ calzado: new Error('network down') }); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('muestra #mensaje-error visible con texto no vacío y mantiene select/checkboxes deshabilitados', async () => {
    await cargarApp();

    const mensajeError = document.getElementById('mensaje-error');
    expect(mensajeError.hasAttribute('hidden')).toBe(false);
    expect(mensajeError.textContent.trim().length).toBeGreaterThan(0);
    expect(mensajeError.textContent).toBe(MSG_ERROR_CATALOGO);

    expect(document.getElementById('tipo-calzado-select').disabled).toBe(true);
    const checkboxes = document.querySelectorAll('#fs-reparaciones input[type="checkbox"]');
    checkboxes.forEach((chk) => expect(chk.disabled).toBe(true));
  });
});
