# Plantilla de Menus/Opciones por Perfil (Toproc)

Base tomada de tus migraciones actuales:

- Perfiles: `public`, `session`, `super_admin`, `security_admin`, `supervisor`
- Subsistemas: `Seguridad`, `Control de Inventario`

Usa esta plantilla para definir visibilidad en frontend (menu/opcion) por perfil.
Luego refleja esta matriz en el SQL: `docs/05-Guides/permisologia-menus-opciones-adaptativa.sql`.

## 1) Catalogo de Menus

| menu_na | subsystem_na | frontend_label (opcional) | activo (si/no) |
|---|---|---|---|
| Prestamos | Control de Inventario | Prestamos | si |
| Devoluciones | Control de Inventario | Devoluciones | si |
| Inventario | Control de Inventario | Inventario | si |
| Mantenimiento | Control de Inventario | Mantenimiento | si |
| Reportes | Control de Inventario | Reportes | si |
| Notificar | Control de Inventario | Notificar | si |
| Solicitudes | Control de Inventario | Solicitudes | si |
| Usuarios | Seguridad | Usuarios | si |
| Perfil | Seguridad | Perfil | si |
| Subsistema | Seguridad | Subsistema | si |
| Objetos | Seguridad | Objetos | si |
| Metodos | Seguridad | Metodos | si |

## 2) Catalogo de Opciones

Recomendacion simple: `option_na = menu_na` para mantener mapeo 1:1.

| option_na | method_na_referencia | activo (si/no) |
|---|---|---|
| Prestamos | getAll | si |
| Devoluciones | getAll | si |
| Inventario | getAll | si |
| Mantenimiento | getAll | si |
| Reportes | getAll | si |
| Notificar | getAll | si |
| Solicitudes | getAll | si |
| Usuarios | getAll | si |
| Perfil | getAll | si |
| Subsistema | getAll | si |
| Objetos | getAll | si |
| Metodos | getAll | si |

## 3) Relacion Menu-Opcion

| subsystem_na | menu_na | option_na |
|---|---|---|
| Control de Inventario | Prestamos | Prestamos |
| Control de Inventario | Devoluciones | Devoluciones |
| Control de Inventario | Inventario | Inventario |
| Control de Inventario | Mantenimiento | Mantenimiento |
| Control de Inventario | Reportes | Reportes |
| Control de Inventario | Notificar | Notificar |
| Control de Inventario | Solicitudes | Solicitudes |
| Seguridad | Usuarios | Usuarios |
| Seguridad | Perfil | Perfil |
| Seguridad | Subsistema | Subsistema |
| Seguridad | Objetos | Objetos |
| Seguridad | Metodos | Metodos |

## 4) Matriz Perfil x Navegacion

Marca con `x` lo que debe ver cada perfil.

| profile_na | subsystem_na | menu_na | option_na | visible |
|---|---|---|---|---|
| super_admin | Seguridad | Usuarios | Usuarios | x |
| super_admin | Seguridad | Perfil | Perfil | x |
| super_admin | Seguridad | Subsistema | Subsistema | x |
| super_admin | Seguridad | Objetos | Objetos | x |
| super_admin | Seguridad | Metodos | Metodos | x |
| super_admin | Control de Inventario | Prestamos | Prestamos | x |
| super_admin | Control de Inventario | Devoluciones | Devoluciones | x |
| super_admin | Control de Inventario | Inventario | Inventario | x |
| super_admin | Control de Inventario | Mantenimiento | Mantenimiento | x |
| super_admin | Control de Inventario | Reportes | Reportes | x |
| super_admin | Control de Inventario | Notificar | Notificar | x |
| super_admin | Control de Inventario | Solicitudes | Solicitudes | x |
| security_admin | Seguridad | Usuarios | Usuarios | x |
| security_admin | Seguridad | Perfil | Perfil | x |
| security_admin | Seguridad | Subsistema | Subsistema | x |
| security_admin | Seguridad | Objetos | Objetos | x |
| security_admin | Seguridad | Metodos | Metodos | x |
| supervisor | Control de Inventario | Prestamos | Prestamos |  |
| supervisor | Control de Inventario | Devoluciones | Devoluciones |  |
| session | Control de Inventario | Prestamos | Prestamos |  |
| public | Control de Inventario | Reportes | Reportes |  |

## 5) Nombres de Perfil en Frontend (hardcode opcional)

Si quieres mostrar etiquetas amigables sin cambiar `profile_na` en DB:

| profile_na (DB) | profile_label (Front) |
|---|---|
| public | Publico |
| session | Sesion |
| super_admin | Super Administrador |
| security_admin | Administrador de Seguridad |
| supervisor | Supervisor |

## 6) Regla operativa

- La navegacion (lo que se ve) sale de `profile_menu` + `profile_option` + `profile_subsystem`.
- La ejecucion (lo que realmente puede hacer) sigue dependiendo de `profile_method`.
- Para evitar menu roto, todo menu visible debe tener al menos una opcion asociada.
