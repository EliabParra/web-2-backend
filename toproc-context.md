# Contexto Core: Toproc Framework

## 1. Identidad del Proyecto
* **Nombre:** Toproc.
* **Naturaleza:** Framework backend Open Source, diseñado con una filosofía transaccional estricta. Es el proyecto de tesis de Eliab y la base de su futura empresa.
* **Filosofía del Creador (Eliab):** Odia ensuciar el sistema operativo host (Zorin OS / Arch). Todo debe estar fuertemente contenerizado. Amante del Open Source, el Clean Code y los principios SOLID.

## 2. Stack Tecnológico & Infraestructura
* **Core:** Node.js, TypeScript estricto.
* **Patrón Arquitectónico:** Business Objects (BO) para el dominio (`BaseBO`, `BOService`), orquestación de transacciones centralizada (`TransactionOrchestrator`, `TransactionExecutor`).
* **Base de Datos:** PostgreSQL (gestión estructurada por migraciones DDL/DML y seeders).
* **Infraestructura:** 100% Dockerizado (`docker-compose`, `Dockerfile`). Cero dependencias locales más allá de Node/Docker.

## 3. Reglas Arquitectónicas Inquebrantables (Paranoia Mode)
1. **Seguridad Primero:** Uso estricto de `PermissionGuard`, validación de roles, prevención de inyecciones SQL y sanitización de inputs. Todo endpoint debe estar blindado.
2. **Aislamiento Transaccional:** NINGUNA operación de base de datos ocurre fuera del `TransactionOrchestrator`. Si falla, hace rollback absoluto.
3. **Ofuscación y Distribución:** El código sensible y la capa de seguridad deben estar preparados para ser ofuscados antes de un release de distribución.
4. **Desarrollo Limpio (SDD):** Todo desarrollo nuevo debe empezar con un archivo Spec. Se usan las Skills de `.agents/skills` (SOLID, Clean Code, Docker Expert) para asegurar la calidad.
