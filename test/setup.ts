/**
 * Bootstrap compartido de tests.
 *
 * Cargado vía `node --import` para que todos los tests
 * arranquen con un entorno consistente y sin dependencias de framework.
 *
 * @module test/setup
 */

process.env.NODE_ENV ??= 'test'
process.env.TZ ??= 'UTC'
