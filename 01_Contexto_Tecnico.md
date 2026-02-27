# 1. Stack Detectado
* **Lenguaje:** TypeScript / Node.js
* **Arquitectura:** Orientada a Business Objects (BO), inyección de dependencias (`Container.ts`), y ruteo HTTP tradicional (Express/Koa presumiblemente).
* **Testing:** Entorno mixto (Archivos `.mjs` y `.ts`), se asume uso de Jest o Vitest.

# 2. Reglas de Estilo (Linter/Format)
* **Tipado Estricto:** Prohibido el uso de `any` en los mocks de pruebas. Se deben utilizar utilidades como `Partial<T>` o Casteo seguro para simular dependencias.
* **Nombrado de Tests:** Deben seguir el estándar: `should [expected behavior] when [state/condition]`.
* **Precisión y Limpieza:** (Basado en Estándares de Ingeniería Total). Nada de suposiciones ni "magic numbers". Los datos de prueba (payloads) deben estar en un directorio `__fixtures__` o generados a través de factorías.

# 3. Definiciones de Datos
* Las pruebas unitarias deben enfocarse en los Business Objects (ej. `AuthBO.ts`, `NotificationBO.ts`).
* Las dependencias inyectables (ej. `DatabaseService`, `EmailService`) deben ser sistemáticamente interceptadas y mockeadas en el `Container` antes de ejecutar el módulo de prueba.