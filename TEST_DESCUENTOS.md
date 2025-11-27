# TEST DE DESCUENTOS - Guía de Verificación

## ⚠️ PROBLEMA REPORTADO
Los descuentos NO se ven en la web. El cliente NO sabe si hay descuentos disponibles.

## 🔍 VERIFICACIÓN PASO A PASO

### PASO 1: Verificar que los descuentos están en Supabase

1. Ve a Supabase → Table Editor
2. Abre la tabla `product_quantity_discounts`
3. **¿Hay registros?**
   - ✅ SÍ → Continúa al Paso 2
   - ❌ NO → Ve al PASO 1B

#### PASO 1B: Crear descuentos desde el admin
1. Abre: `http://localhost:3000/admin.html`
2. Login: `admin@regaloamor.cl` / `admin123`
3. Edita un producto
4. Pestaña "Precios" → Scroll a "Descuentos por Cantidad"
5. Configura:
   - **Desde:** 3 → **% Dcto:** 10
   - **Desde:** 5 → **% Dcto:** 15
6. Guarda el producto
7. Vuelve a Supabase y verifica que ahora SÍ hay registros en `product_quantity_discounts`

---

### PASO 2: Verificar que el JavaScript se cargó correctamente

1. Abre: `http://localhost:3000/`
2. Presiona **F12** (abrir DevTools)
3. Ve a la pestaña **Console**
4. Escribe y ejecuta:
   ```javascript
   // Ver versión del código
   fetch('/js/supabase-client.js').then(r => r.text()).then(t =>
     console.log(t.includes('quantity_discounts:product_quantity_discounts') ?
       '✅ Código actualizado' :
       '❌ Código desactualizado - HACER HARD REFRESH')
   )
   ```
5. Si dice "❌ Código desactualizado":
   - Presiona **Ctrl+Shift+R** (Windows) o **Cmd+Shift+R** (Mac)
   - Espera 5 segundos
   - Ejecuta el comando de nuevo

---

### PASO 3: Verificar que un producto tiene descuentos

1. En DevTools Console, ejecuta:
   ```javascript
   // Obtener productos
   getProducts({limit: 10}).then(result => {
     console.log('Productos:', result.products);
     const conDescuentos = result.products.filter(p => p.quantity_discounts?.length > 0);
     console.log(`✅ ${conDescuentos.length} productos con descuentos`);
     if (conDescuentos.length > 0) {
       console.log('Primer producto con descuentos:', conDescuentos[0]);
     }
   });
   ```

2. **¿El console muestra "N productos con descuentos"?**
   - ✅ SÍ (N > 0) → Continúa al Paso 4
   - ❌ NO (0) → Los productos no tienen descuentos configurados, vuelve al Paso 1B

---

### PASO 4: Verificar que se muestran en el modal de producto

1. En la página principal, haz clic en **un producto que tenga descuentos**
2. **¿Se abre el modal del producto?** → SÍ
3. **¿Ves una sección "Descuentos por Cantidad"?**
   - ✅ SÍ → Perfecto, continúa
   - ❌ NO → Abre DevTools Console y busca errores en rojo

4. Si NO ves la sección, ejecuta en Console:
   ```javascript
   // Ver si el producto actual tiene descuentos
   console.log('Producto actual:', Products.currentProduct);
   console.log('Descuentos:', Products.currentProduct?.quantity_discounts);
   ```

---

### PASO 5: Verificar que el precio cambia al seleccionar cantidad

1. En el modal del producto:
2. Cambia la **cantidad** a 3 (o la cantidad mínima del descuento)
3. **¿El precio cambió?**
   - ✅ SÍ → Perfecto
   - ❌ NO → Error en updatePriceDisplay

4. Si NO cambia, ejecuta en Console:
   ```javascript
   // Forzar actualización
   Products.updatePriceDisplay();
   ```

---

### PASO 6: Verificar que se muestra en el carrito

1. Agrega el producto al carrito con cantidad 3+
2. Abre el carrito (ícono superior derecha)
3. **¿Ves el precio original tachado + badge verde "-X% DTO"?**
   - ✅ SÍ → Perfecto
   - ❌ NO → Error en renderizaje del carrito

4. **¿Ves "✨ Ahorro total: $X"?**
   - ✅ SÍ → Todo funcionando
   - ❌ NO → Error en cálculo de ahorros

---

## 🐛 ERRORES COMUNES

### Error: "quantity_discounts is undefined"
**Causa:** El código JavaScript no se actualizó
**Solución:** Hard refresh (Ctrl+Shift+R)

### Error: "Cannot read property 'length' of undefined"
**Causa:** El producto no tiene descuentos cargados
**Solución:** Verifica Paso 1 y Paso 3

### Error: La sección de descuentos no aparece
**Causa:** CSS está ocultando o JavaScript no ejecuta
**Solución:** Verifica en Console:
```javascript
document.getElementById('modalQuantityDiscounts').style.display
// Debe retornar 'block' o 'flex' si hay descuentos
```

### Error: El precio no cambia al seleccionar cantidad
**Causa:** Evento 'change' no está binding
**Solución:** Ejecuta en Console:
```javascript
document.getElementById('productQty').value = 5;
Products.updatePriceDisplay();
```

---

## ✅ CHECKLIST FINAL

- [ ] Los descuentos existen en Supabase (`product_quantity_discounts`)
- [ ] El JavaScript está actualizado (hard refresh hecho)
- [ ] Los productos cargan con `quantity_discounts` en Console
- [ ] El modal muestra sección "Descuentos por Cantidad"
- [ ] El precio cambia al seleccionar cantidad diferente
- [ ] El carrito muestra precio original tachado + badge
- [ ] El carrito muestra "Ahorro total"

---

## 🆘 SI NADA FUNCIONA

Ejecuta este comando completo en DevTools Console:

```javascript
// TEST COMPLETO DE DESCUENTOS
(async function testDescuentos() {
  console.log('=== TEST DE DESCUENTOS ===\n');

  // 1. Verificar código
  const jsCode = await fetch('/js/supabase-client.js').then(r => r.text());
  console.log('1. Código actualizado:', jsCode.includes('quantity_discounts:product_quantity_discounts') ? '✅' : '❌ HACER HARD REFRESH');

  // 2. Verificar productos
  const {products} = await getProducts({limit: 10});
  const conDescuentos = products.filter(p => p.quantity_discounts?.length > 0);
  console.log(`2. Productos con descuentos: ${conDescuentos.length}/${products.length}`);

  if (conDescuentos.length > 0) {
    console.log('   Ejemplo:', {
      nombre: conDescuentos[0].name,
      descuentos: conDescuentos[0].quantity_discounts
    });

    // 3. Verificar elementos HTML
    const elementsExist = {
      modalQuantityDiscounts: !!document.getElementById('modalQuantityDiscounts'),
      quantityDiscountsList: !!document.getElementById('quantityDiscountsList'),
      cartSavings: !!document.getElementById('cartSavings'),
      summarySavings: !!document.getElementById('summarySavings')
    };
    console.log('3. Elementos HTML:', elementsExist);

    // 4. Test de cálculo
    const testPrice = Utils.calculateQuantityDiscount(10000, 5, conDescuentos[0].quantity_discounts);
    console.log('4. Test cálculo:', {
      precioOriginal: 10000,
      cantidad: 5,
      precioConDescuento: testPrice,
      descuentoAplicado: Math.round((1 - testPrice/10000) * 100) + '%'
    });
  } else {
    console.log('❌ NO HAY PRODUCTOS CON DESCUENTOS');
    console.log('   Ve al admin y configura descuentos en un producto');
  }

  console.log('\n=== FIN DEL TEST ===');
})();
```

**Copia y pega este comando completo en la Console y envía screenshot del resultado.**
