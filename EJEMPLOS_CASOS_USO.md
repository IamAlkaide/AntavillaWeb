# Ejemplos de Consolidación de Libros

## Caso 1: Cuatro libros diferentes (sin consolidación)

### Entrada (CSV):
```
Marca temporal  | Asignatura        | Curso  | ISBN    | Estado      | Nombre  | Contacto
2026-06-01      | Lengua            | 1º ESO | 123456  | Disponible  | Carlos  | carlos@email.com
2026-06-02      | Mates             | 2º ESO | 111111  | Disponible  | Alberto | alberto@email.com
2026-06-03      | Mates             | 3º ESO | 222222  | Disponible  | Bea     | bea@email.com
2026-06-03      | Lengua            | 1º ESO | 123456  | Disponible  | Carlos  | carlos@email.com
```

### Análisis:
- **Grupo 1**: ISBN 123456 | Carlos | carlos@email.com
  - Día 1 (2026-06-01): Disponible
  - Día 3 (2026-06-03): Disponible
  - **Diferencia**: 2 días ✓ (< 365 días)
  - **Acción**: Son ediciones del mismo libro → Mantener solo el más reciente (Día 3)

- **Grupo 2**: ISBN 111111 | Alberto | alberto@email.com
  - Día 2 (2026-06-02): Disponible
  - **Acción**: Libro único → Mostrar tal cual

- **Grupo 3**: ISBN 222222 | Bea | bea@email.com
  - Día 3 (2026-06-03): Disponible
  - **Acción**: Libro único → Mostrar tal cual

### Salida (Tabla):
```
3 libros encontrados

| Asignatura | Curso  | ISBN   | Estado      | Comentarios | Nombre  | eMail o teléfono         |
|-----------|--------|--------|-------------|-------------|---------|----------------------|
| Lengua    | 1º ESO | 123456 | Disponible  | —           | Carlos  | carlos@email.com     |
| Mates     | 2º ESO | 111111 | Disponible  | —           | Alberto | alberto@email.com    |
| Mates     | 3º ESO | 222222 | Disponible  | —           | Bea     | bea@email.com        |
```

---

## Caso 2: Actualización de estado en menos de 365 días

### Entrada adicional:
```
2026-06-08 | Mates | 2º ESO | 111111 | Donado | Alberto | alberto@email.com
```

### Análisis:
- **Grupo 1**: ISBN 123456 | Carlos | carlos@email.com
  - Sin cambios → 1 registro "Disponible" del Día 3

- **Grupo 2**: ISBN 111111 | Alberto | alberto@email.com
  - Día 2 (2026-06-02): Disponible
  - Día 8 (2026-06-08): Donado ← **5 días después**
  - **Diferencia**: 5 días ✓ (< 365 días)
  - **Acción**: Es una actualización del mismo libro → Mostrar SOLO el más reciente (Donado)

- **Grupo 3**: ISBN 222222 | Bea | bea@email.com
  - Sin cambios → 1 registro "Disponible"

### Salida (Tabla):
```
3 libros encontrados

| Asignatura | Curso  | ISBN   | Estado         | Comentarios | Nombre  | eMail o teléfono         |
|-----------|--------|--------|----------------|-------------|---------|----------------------|
| Lengua    | 1º ESO | 123456 | Disponible     | —           | Carlos  | carlos@email.com     |
| Mates     | 2º ESO | 111111 | No disponible  | —           | Alberto | alberto@email.com    |
| Mates     | 3º ESO | 222222 | Disponible     | —           | Bea     | bea@email.com        |
```

---

## Caso 3: Mismo libro donado más de 365 días después (nuevo envío)

### Entrada adicional:
```
2027-07-11 | Lengua | 1º ESO | 123456 | Donado | Carlos | carlos@email.com
```

### Análisis:
- **Grupo 1**: ISBN 123456 | Carlos | carlos@email.com
  - Día 1 (2026-06-01): Disponible
  - Día 3 (2026-06-03): Disponible → Consolida con Día 1 → 1 slot (Día 3)
  - Día 401 (2027-07-11): Donado
  - **Diferencia (Día 3 vs Día 401)**: 400 días ✗ (> 365 días)
  - **Acción**: NO es actualización, es un NUEVO libro
  - **Resultado**: 
    - Mantener slot de "Disponibles" (Día 3)
    - Añadir registro de "No disponibles" (Día 401)

### Salida (Tabla):
```
4 libros encontrados

| Asignatura | Curso  | ISBN   | Estado         | Comentarios | Nombre  | eMail o teléfono         |
|-----------|--------|--------|----------------|-------------|---------|----------------------|
| Lengua    | 1º ESO | 123456 | Disponible     | —           | Carlos  | carlos@email.com     |
| Mates     | 2º ESO | 111111 | No disponible  | —           | Alberto | alberto@email.com    |
| Mates     | 3º ESO | 222222 | Disponible     | —           | Bea     | bea@email.com        |
| Lengua    | 1º ESO | 123456 | No disponible  | —           | Carlos  | carlos@email.com     |
```

---

## Caso 4: Múltiples "Disponibles" + "No disponible"

### Entrada:
```
2026-06-01 | Historia | 1º ESO | 333333 | Disponible | Carlos | carlos@email.com
2026-06-02 | Historia | 1º ESO | 333333 | Disponible | Carlos | carlos@email.com
2026-06-03 | Historia | 1º ESO | 333333 | Disponible | Carlos | carlos@email.com
2026-06-04 | Historia | 1º ESO | 333333 | Donado     | Carlos | carlos@email.com
```

### Análisis:
- **Grupo: ISBN 333333 | Carlos | carlos@email.com**
  - Registros "Disponible":
    - Día 1 (2026-06-01): Disponible
    - Día 2 (2026-06-02): Disponible
    - Día 3 (2026-06-03): Disponible
    - **Todos están separados <365 días entre sí** → Son el mismo libro → Consolidar a 1 slot
    - **Mantener el más reciente**: Día 3
  
  - Registros "No disponible":
    - Día 4 (2026-06-04): Donado
    - **Mantener el más reciente**: Día 4

### Salida (Tabla):
```
2 libros encontrados

| Asignatura | Curso  | ISBN   | Estado         | Comentarios | Nombre  | eMail o teléfono         |
|-----------|--------|--------|----------------|-------------|---------|----------------------|
| Historia  | 1º ESO | 333333 | Disponible     | —           | Carlos  | carlos@email.com     |
| Historia  | 1º ESO | 333333 | No disponible  | —           | Carlos  | carlos@email.com     |
```

---

## Caso 5: Múltiples "Disponibles" separados > 365 días

### Entrada:
```
2026-06-01 | Física | 2º ESO | 444444 | Disponible | David | david@email.com
2027-07-10 | Física | 2º ESO | 444444 | Disponible | David | david@email.com
```

### Análisis:
- **Grupo: ISBN 444444 | David | david@email.com**
  - Registros "Disponible":
    - Día 1 (2026-06-01): Disponible
    - Día 400 (2027-07-10): Disponible
    - **Diferencia**: 400 días ✗ (> 365 días)
    - **Acción**: Son DOS libros DISTINTOS → Mantener ambos

### Salida (Tabla):
```
2 libros encontrados

| Asignatura | Curso  | ISBN   | Estado     | Comentarios | Nombre | eMail o teléfono      |
|-----------|--------|--------|-----------|-------------|--------|-------------------|
| Física    | 2º ESO | 444444 | Disponible | —           | David  | david@email.com   |
| Física    | 2º ESO | 444444 | Disponible | —           | David  | david@email.com   |
```

---

## Resumen de Reglas

| Situación | Acción | Resultado |
|-----------|--------|-----------|
| Mismo ISBN + persona, 2 "Disponibles" < 365 días | Consolidar | 1 registro (el más reciente) |
| Mismo ISBN + persona, 2 "Disponibles" > 365 días | No consolida | 2 registros |
| Mismo ISBN + persona, "Disponible" + "No disponible" | Mantener ambos | 2 registros independientes |
| Mismo ISBN + persona, 1 "No disponible" | Mostrar | 1 registro (el más reciente del grupo) |
| ISBN o persona diferente | Siempre separa | Registros independientes |

---

## Notas Técnicas

### Threshold (Umbral de Consolidación)
- **365 días** = 365 × 24 × 60 × 60 × 1000 ms = 31.536.000.000 ms
- Cubre: 1 curso escolar + verano (junio a septiembre del año siguiente)
- Es configurable en el código: `UMBRAL_ACTUALIZACION_MS`

### Orden de Procesamiento
1. **Agrupar** por ISBN + Nombre + Contacto
2. **Separar** dentro de cada grupo: disponibles vs. no-disponibles
3. **Procesar no-disponibles**: mantener el más reciente
4. **Procesar disponibles**: aplicar regla de 365 días
5. **Combinar**: mostrar todos los registros únicos resultantes

### Búsqueda/Filtrado
- Búsqueda ocurre DESPUÉS de consolidación
- Se busca en todos los campos del registro consolidado
- Ejemplo: buscar "carlos" encuentra ambos registros de Carlos (disponible + no disponible)
