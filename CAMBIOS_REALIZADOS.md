# Cambios Realizados en privado-libros.js

## Problema Identificado
La lógica anterior de consolidación no manejaba correctamente los siguientes casos:
1. Múltiples registros del mismo libro (ISBN + propietario) en estados diferentes
2. Diferenciación entre actualizaciones de estado vs. libros nuevos
3. Visualización correcta cuando existen libros "No disponibles" y "Disponibles" del mismo ISBN

## Solución Implementada

### 1. Nueva Función `consolidar()`
Reescrita completamente con la siguiente lógica:

#### Paso 1: Agrupación por Clave
```
Clave = ISBN | Nombre | Contacto
```
Todos los registros se agrupan por esta clave única, separando:
- `disponibles[]` → registros con estado "Disponible"
- `noDisponibles[]` → registros con estado "No disponible", "Donado", "Entregado"

#### Paso 2: Procesamiento de "No Disponibles"
- Si existe al menos un registro con estado "No disponible" → mostrar el **MÁS RECIENTE**
- Esto asegura que si Carlos actualiza un libro a "Donado", se vea el último cambio

#### Paso 3: Procesamiento de "Disponibles"
Dentro de los registros disponibles de un grupo:
- Aplicar la regla de **actualización dentro de 365 días (1 curso escolar + verano)**
- Si dos "Disponibles" están separados <365 días → el mismo libro en edición → mostrar solo el más reciente
- Si están separados ≥365 días → libros distintos → mostrar ambos

### 2. Función Auxiliar `getValor()`
Simplifica el acceso a valores por índice relativo:
```javascript
getValor(fila, offset, indice)
```
Hace el código más legible y evita errores de indexación.

## Casos de Uso Cubiertos

### Caso 1: Cuatro libros diferentes ✅
```
Carlos → Lengua 1º ESO, ISBN 123456, Disponible
Alberto → Mates 2º ESO, ISBN 111111, Disponible
Bea → Mates 3º ESO, ISBN 222222, Disponible
Carlos → Lengua 1º ESO, ISBN 123456, Disponible (1 hora después)
```
**Resultado:** 3 registros en tabla
- Lengua 1º ESO (Carlos) - Estado: Disponible [el más reciente]
- Mates 2º ESO (Alberto) - Estado: Disponible
- Mates 3º ESO (Bea) - Estado: Disponible

### Caso 2: Actualización de estado ✅
```
[Continuando del caso anterior]
Alberto → Mates 2º ESO, ISBN 111111, Donado (5 días después)
```
**Resultado:** 3 registros en tabla
- Lengua 1º ESO (Carlos) - Estado: Disponible
- **Mates 2º ESO (Alberto) - Estado: No disponible** [actualizado]
- Mates 3º ESO (Bea) - Estado: Disponible

### Caso 3: Libro nuevo vs. actualización ✅
```
[Continuando]
Carlos → Lengua 1º ESO, ISBN 123456, Donado (370 días después)
```
**Resultado:** 4 registros en tabla
- Lengua 1º ESO (Carlos) - Estado: Disponible [primer envío]
- **Lengua 1º ESO (Carlos) - Estado: No disponible** [segundo envío, 370 días después]
- Mates 2º ESO (Alberto) - Estado: No disponible
- Mates 3º ESO (Bea) - Estado: Disponible

**Explicación:** Como pasaron 370 días (>365), se considera un libro nuevo, no una actualización del anterior.

### Caso 4: Múltiples "Disponibles" + "No Disponible" ✅
```
[Nuevo ejemplo]
Carlos → Historia 1º ESO, ISBN 333333, Disponible (Día 1)
Carlos → Historia 1º ESO, ISBN 333333, Disponible (Día 2)
Carlos → Historia 1º ESO, ISBN 333333, Disponible (Día 3)
Carlos → Historia 1º ESO, ISBN 333333, Donado (Día 4)
```
**Resultado:** 2 registros en tabla
- Historia 1º ESO (Carlos) - Estado: Disponible [el último de los disponibles antes del cambio]
- **Historia 1º ESO (Carlos) - Estado: No disponible** [el más reciente]

**Explicación:** Los tres primeros "Disponibles" están todos dentro de 365 días entre sí → mismo libro → mostrar solo el último. El "Donado" es independiente → mostrar también.

## Cambios de Código

### Antes (Incorrecto)
```javascript
// Solo mantenía 1 registro por ISBN+nombre+contacto
// No diferenciaba entre estados
// Perdía información sobre múltiples "Disponibles"
```

### Después (Correcto)
```javascript
// Agrupa por ISBN+nombre+contacto
// Separa disponibles de no-disponibles
// Dentro de disponibles, aplica regla de 365 días
// Muestra el más reciente de no-disponibles
// Muestra todos los slots de disponibles (con consolida 365 días)
```

## Archivos Afectados

- ✅ **privado-libros.js** → MODIFICADO (lógica de consolidación)
- ✅ **privado-libros.html** → Sin cambios
- ✅ **privado.html** → Sin cambios
- ✅ **privado.js** → Sin cambios
- ✅ **socios.html** → Sin cambios

## Pruebas Recomendadas

1. Añadir varios libros del mismo propietario con diferente ISBN
2. Actualizar un libro a "No disponible" en menos de 365 días
3. Añadir el mismo libro (ISBN + nombre) 370+ días después
4. Verificar que la búsqueda filtra correctamente los resultados consolidados

## Notas Técnicas

- El umbral de 365 días se puede ajustar modificando `UMBRAL_ACTUALIZACION_MS`
  - Valor actual: `365 * 24 * 60 * 60 * 1000` ms = 31.536.000.000 ms
  - Cubre: 1 curso escolar + verano (junio a septiembre del año siguiente)
- El offset de columnas se detecta automáticamente
- Los timestamps de Google Forms se parseán en formato dd/mm/yyyy hh:mm:ss
