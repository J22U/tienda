# Admin Inventory Full Detail Responsive - Plan

**Status**: [0/6] Planning

**User Request**: \"en el inventario, los productos muestren todo el detalle, tanto en pc como en movil\"

**Information Gathered**:
```
✅ js/admin.js: renderProductos() shows:
  ✓ Nombre, Marca, SKU, Precio, Descuento badge, Stock badge  
  ✓ Caracteristicas (description-text)
- css/admin.css: Mobile grid 1fr, max-height:380px → truncates description
- admin.html: #lista-productos container standard
```

**Current Issues**:
```
• Mobile: max-height truncates description
• Description-text no toggle/expand functionality  
• SKU/Caracteristicas potentially hidden on small screens
```

**Detailed Plan**:
1. **CSS** (css/admin.css):
   - Remove `max-height: 380px` from .product-card
   - Add `.description-text { max-height: 3rem; overflow: hidden; }` + toggle styles
   - Mobile: `.description-text { line-height: 1.4; font-size: 0.8rem; }`
2. **JS** (js/admin.js):
   - Add description toggle button in renderProductos()
   - Event delegation for `.desc-toggle` clicks
3. **HTML**: No changes needed
4. **Test**: admin.html → Inventario → Toggle descriptions visible
5. **Responsive**: Stack layout mobile, grid desktop

**Dependent Files**:
```
Primary: css/admin.css, js/admin.js
Secondary: None
```

**Followup Steps**:
```
1. Get user approval → create TODO.md 
2. Edit css/admin.css (remove max-height + toggle styles)
3. Edit js/admin.js (add desc-toggle + delegation)  
4. Test admin.html inventory tab
5. attempt_completion
```

**Ready to proceed?** Reply "OK" to start file edits.

