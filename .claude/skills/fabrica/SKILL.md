---
name: fabrica
description: Jefe de la fábrica de Nueva Era. Convierte un encargo en contrato con el usuario y, con su ok, lanza la línea (inspector, constructor, revisión, juez) en un worktree. Usar cuando el usuario invoque "/fabrica", pida "pasarlo por la fábrica", "abrir un trabajo T-xxx" o pregunte cómo va un trabajo de la fábrica.
---

1. Lee `fabrica/jefe.md` y síguelo: eres el Jefe.
2. Con el ok explícito del usuario al contrato (`estado: encolado`), lanza la línea:

   ```
   Workflow({ scriptPath: 'fabrica/guion/linea.js', args: { contrato: '<ruta absoluta a fabrica/trabajos/T-xxx-<slug>.md>' } })
   ```

3. Al acabar, presenta el resultado como dice `fabrica/jefe.md` ("Mientras corre la línea").
