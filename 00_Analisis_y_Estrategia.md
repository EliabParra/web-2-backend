# 1. Objetivo del Sprint
Establecer una arquitectura de pruebas sólida, estandarizada y escalable para el backend Web 2.0. El objetivo es transicionar de pruebas dispersas a una suite determinista (pruebas unitarias para Business Objects y de integración para flujos de API/Transacciones), incrementando la confianza en el CI/CD.

# 2. Análisis Crítico del Estado Actual
* **Inconsistencia de Extensiones:** Existen scripts de prueba en formato `.mjs` (ej. `test/app-validator.test.mjs`) y `.ts` (ej. `test/scripts/db/SchemaLoader.test.ts`). Esto sugiere una deuda técnica en la consolidación del framework de testing (probablemente migrando a TS nativo con herramientas como Vitest o ts-jest).
* **Falta de Aislamiento:** Al observar la estructura de base de datos (`migrations/ddl`) y servicios (`DatabaseService`, `EmailService`), existe el riesgo de que los tests actuales sean frágiles ("flaky tests") si no están mockeando adecuadamente la infraestructura externa (I/O).
* **Code Smells en QA:** Riesgo de "Magic Strings" o configuraciones hardcodeadas en los tests en lugar de utilizar Factories y Fixtures centralizados.

# 3. Plan de Arquitectura
* **Estandarización:** Unificar todo el testing bajo TypeScript (`.test.ts`).
* **Patrón AAA (Arrange, Act, Assert):** Obligatorio en cada bloque `it` o `test`.
* **Aislamiento (Mocking):** Se aprovechará el `Container.ts` (Inyección de Dependencias) para inyectar repositorios de base de datos en memoria o mocks (`vi.fn()` / `jest.fn()`) durante las pruebas unitarias de los `BO` (ej. `AuthBO`).
* **Pruebas de Integración:** Utilizar una base de datos efímera (Testcontainers o SQLite en memoria) para probar el flujo completo desde el `Controller` hasta el `Repository`.