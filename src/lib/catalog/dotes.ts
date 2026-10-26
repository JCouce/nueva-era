// GENERADO por scripts/generar-catalogo-dotes.ts (npm run gen-dotes). No editar a mano:
// se cambia el borrador (docs/modelado-dotes.json), la transcripción (docs/dotes.md) o la
// tabla de destinos (dotesDestinos.ts) y se regenera. Compra (docs/sistema.md §9.1) y
// efectos con su MotorMetadata (§9.3); qué se aplica ya, rules/dotesEfectos.ts.
import type { DoteCatalogo } from "./dotesTipos";

export const DOTES: readonly DoteCatalogo[] = [
  {
    "id": "dote_apoyo",
    "label": "Apoyo",
    "grupo": "actitud",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "uno_de",
        "opciones": [
          {
            "tipo": "especialidad",
            "habilidad": "actitud",
            "id": "empatia",
            "min": 1
          },
          {
            "tipo": "especialidad",
            "habilidad": "actitud",
            "id": "liderazgo",
            "min": 1
          }
        ]
      },
      {
        "tipo": "aplicado",
        "id": "expresion",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede realizar una reacción o una acción simple para apoyar a un aliado que se encuentra en una situación difícil. Realiza una prueba de **expresión + empatía o liderazgo** con una dificultad de 7, en caso de éxito el aliado puede: relanzar una tirada de salvación contra un efecto emocional o mental que le esté afectando o realizar un *(sic)* prueba en su siguiente turno con un bonificador de +2, en caso de éxito crítico la salvación recibe un bonificador de +2 y en la prueba el bonificador pasa a ser de +3.\n\nEsta dote puede emplearse una vez por aliado por escena. Si el vínculo de afecto entre los aliados es fuerte, el personaje gana ventaja en la tirada de apoyo.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_apoyo",
          "label": "Apoyo",
          "economia": [
            "reaccion",
            "simple"
          ],
          "limite": {
            "veces": 1,
            "por": "aliado"
          },
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "expresion",
            "habilidad": "actitud",
            "especialidad": [
              "empatia",
              "liderazgo"
            ],
            "dificultad": 7
          },
          "objetivoTira": [],
          "resultados": {
            "exito": {
              "texto": "El aliado elige: relanzar una tirada de salvación contra un efecto emocional o mental que le esté afectando, o +2 a una prueba en su siguiente turno."
            },
            "critico": {
              "texto": "Como el éxito, pero la salvación relanzada lleva +2 y la prueba del siguiente turno +3."
            }
          },
          "notas": [
            {
              "texto": "Para apoyar a un aliado que está en una situación difícil.",
              "condicion": null
            },
            {
              "texto": "Con Empatía o Liderazgo: va en especialidad con cualquiera de las dos.",
              "condicion": null
            },
            {
              "texto": "Una vez por aliado y escena.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      },
      {
        "tipo": "ventaja",
        "alcance": "dotes_apoyo",
        "condicion": "¿El vínculo de afecto con el aliado es fuerte?",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": "una vez por aliado por escena (contador por aliado)",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_apoyo"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "dotes_apoyo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_burla",
    "label": "Burla",
    "grupo": "actitud",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "humor",
        "min": 1
      },
      {
        "tipo": "atributo",
        "id": "caracter",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje se burla de un enemigo, lo puede hacer como acción simple o como reacción si el objetivo falla una tirada delante suya. La prueba ser resuelvo *(sic)* con una tirada enfrentada de humor + expresión contra una de voluntad + actitud, la burla puede distraer o enfadar, en caso de tener éxito supone un penalizador de -1 tiradas de perspicacia y voluntad para el objeto de la burla durante 1 minuto, el penalizador es de -2 en caso de éxito crítico, el objetivo se puede resalcir *(sic)* devolviendo la broma o acertando en un ataque al personaje, en tal caso desaparecen los penalizadores y gana un bonificador de +2 por circunstancias a próximas tiradas contra burlas suyas.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_burla",
          "label": "Burla",
          "economia": [
            "simple",
            "reaccion"
          ],
          "limite": null,
          "resolucion": {
            "tipo": "enfrentada",
            "aplicado": "expresion",
            "habilidad": "actitud",
            "especialidad": "humor"
          },
          "objetivoTira": [
            {
              "que": "Voluntad + Actitud"
            }
          ],
          "resultados": {
            "exito": {
              "texto": "El objetivo sufre −1 a sus tiradas de Perspicacia y de Voluntad durante 1 minuto."
            },
            "critico": {
              "texto": "El objetivo sufre −2 a sus tiradas de Perspicacia y de Voluntad durante 1 minuto."
            }
          },
          "notas": [
            {
              "texto": "Como reacción: cuando el objetivo falla una tirada delante de ti.",
              "condicion": null
            },
            {
              "texto": "La burla puede distraer o enfadar.",
              "condicion": null
            },
            {
              "texto": "El objetivo se resarce devolviéndote la broma o acertándote un ataque: desaparecen sus penalizadores y gana +2 por circunstancias a sus próximas tiradas contra tus burlas.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_burla"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_humor_negro",
    "label": "Humor Negro",
    "grupo": "actitud",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "humor",
        "min": 2
      },
      {
        "tipo": "aplicado",
        "id": "voluntad",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Un personaje puede realizar una reacción para repetir una tirada contra un efecto de **miedo** fallado, al hacerlo hace un chiste macabro sobre la posibilidad de la fatalidad, repite la salvación con una prueba de **expresión + humor**, si tiene éxito crítico además influye en los aliados que puedan escucharle, reduciendo su nivel de miedo en un grado.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_humor_negro",
          "label": "Humor negro (repetir salvación contra miedo)",
          "economia": "reaccion",
          "limite": null,
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "expresion",
            "habilidad": "actitud",
            "especialidad": "humor",
            "dificultad": {
              "manual": "la de la salvación contra miedo que fallaste"
            }
          },
          "objetivoTira": [],
          "resultados": {
            "exito": {
              "texto": "Superas la salvación contra el miedo que habías fallado."
            },
            "critico": {
              "texto": "Además, los aliados que puedan oírte reducen su miedo un grado."
            }
          },
          "notas": [
            {
              "texto": "Solo tras fallar una tirada contra un efecto de miedo.",
              "condicion": null
            },
            {
              "texto": "Haces un chiste macabro sobre la posibilidad de la fatalidad.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "ofrecer la acción tras fallar una salvación contra miedo",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_humor_negro"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_humor_de_afrontamiento",
    "label": "Humor de Afrontamiento",
    "grupo": "actitud",
    "coste": 5,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "humor",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "expresion",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Una vez por escena el personaje puede utilizar una acción simple o una reacción para fomentar una actitud resiliente. La reacción puede ser desencadenada por un fracaso propio o el de un aliado, el personaje realiza una prueba de **expresión + humor** con dificultad 7, en caso de éxito, todos los aliados que escuchen el chascarrillo reciben un bonificador de +1 durante el próximo minuto contra efectos emocionales y reducen en 1 los penalizadores a tiradas de efectos durante el próximo turno, en caso de éxito crítico, el bonificador contra tiradas emocionales es de +2 durante el próximo minuto y reduce por completo penalizadores a tiradas de fatiga o heridas durante el próximo turno.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_humor_de_afrontamiento",
          "label": "Humor de afrontamiento",
          "economia": [
            "simple",
            "reaccion"
          ],
          "limite": {
            "veces": 1,
            "por": "escena"
          },
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "expresion",
            "habilidad": "actitud",
            "especialidad": "humor",
            "dificultad": 7
          },
          "objetivoTira": [],
          "resultados": {
            "exito": {
              "texto": "Los aliados que oigan el chascarrillo: +1 contra efectos emocionales durante el próximo minuto, y reducen en 1 los penalizadores a sus tiradas de efectos durante el próximo turno."
            },
            "critico": {
              "texto": "Los aliados que lo oigan: +2 contra efectos emocionales durante el próximo minuto, y anulan los penalizadores por fatiga o heridas a sus tiradas durante el próximo turno."
            }
          },
          "notas": [
            {
              "texto": "Como reacción: tras un fracaso tuyo o de un aliado.",
              "condicion": null
            },
            {
              "texto": "Fomenta una actitud resiliente.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "una vez por escena (contador de usos)",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_humor_de_afrontamiento"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_mirada_desafiante",
    "label": "Mirada Desafiante",
    "grupo": "actitud",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "intimidacion",
        "min": 1
      },
      {
        "tipo": "atributo",
        "id": "caracter",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede realizar una mirada como acción gratuita una vez por turno para intimidar a un objetivo, solo podrá emplearla una vez por día por objetivo.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_mirada_desafiante",
          "label": "Mirada desafiante",
          "economia": "gratuita",
          "limite": {
            "veces": 1,
            "por": "turno"
          },
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "expresion",
            "habilidad": "actitud",
            "especialidad": "intimidacion",
            "dificultad": {
              "manual": "la de intimidar a ese objetivo; la fuente no la fija"
            }
          },
          "objetivoTira": [],
          "resultados": {},
          "notas": [
            {
              "texto": "Intimidas a un objetivo con la mirada.",
              "condicion": null
            },
            {
              "texto": "Solo una vez por día contra el mismo objetivo.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "una vez por turno; una vez por día por objetivo",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_mirada_desafiante"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_presencia_imponente",
    "label": "Presencia Imponente",
    "grupo": "actitud",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "fuerza",
        "min": 2
      },
      {
        "tipo": "atributo",
        "id": "caracter",
        "min": 1
      },
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "intimidacion",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje recibe un bonificador de +1 en sus tiradas de intimidación cuando su físico pueda influir en la amenaza, en caso de que su fuerza sea de 5 o superior el bonificador es de +2.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "especialidad:intimidacion",
        "valor": {
          "base": 1,
          "siMin": {
            "tipo": "atributo",
            "id": "fuerza",
            "min": 5,
            "valor": 2
          }
        },
        "condicion": "¿Tu físico influye en la amenaza?",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "especialidad:intimidacion"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_grito_de_guerra",
    "label": "Grito de Guerra",
    "grupo": "actitud",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "caracter",
        "min": 2
      },
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "intimidacion",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje lanza un grito de batalla aterrador como acción gratuita una vez por escena de combate, realiza una prueba de **expresión + intimidación** contra todos los enemigos en un rango de 40 metros.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_grito_de_guerra",
          "label": "Grito de guerra",
          "economia": "gratuita",
          "limite": {
            "veces": 1,
            "por": "escena"
          },
          "resolucion": {
            "tipo": "enfrentada",
            "aplicado": "expresion",
            "habilidad": "actitud",
            "especialidad": "intimidacion"
          },
          "objetivoTira": [
            {
              "que": "Sin definir en la fuente (cada enemigo a 40 m)"
            }
          ],
          "resultados": {},
          "notas": [
            {
              "texto": "Contra todos los enemigos en 40 m.",
              "condicion": null
            },
            {
              "texto": "Solo en escena de combate.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "una vez por escena de combate",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_grito_de_guerra"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_violencia_aterradora",
    "label": "Violencia Aterradora",
    "grupo": "actitud",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "intimidacion",
        "min": 3
      },
      {
        "tipo": "atributo",
        "id": "caracter",
        "min": 1
      },
      {
        "tipo": "dote",
        "id": "dote_mirada_desafiante"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Cuando el personaje reduce a 0 los puntos de golpe de un enemigo mediante un ataque cuerpo a cuerpo letal, gana una acción gratuita de **expresión + intimidación** para aterrorizar a todos los enemigos en un rango de 40 metros que puedan presenciarlo. Puede realizar esta acción una vez por escena de combate. Si el ataque que desencadena la acción es un golpe crítico, el personaje obtiene ventaja en la tirada de intimidación.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_violencia_aterradora",
          "label": "Violencia aterradora",
          "economia": "gratuita",
          "limite": {
            "veces": 1,
            "por": "escena"
          },
          "resolucion": {
            "tipo": "enfrentada",
            "aplicado": "expresion",
            "habilidad": "actitud",
            "especialidad": "intimidacion"
          },
          "objetivoTira": [
            {
              "que": "Sin definir en la fuente (cada enemigo a 40 m que lo presencie)"
            }
          ],
          "resultados": {},
          "notas": [
            {
              "texto": "Solo justo después de dejar a 0 PG a un enemigo con un ataque cuerpo a cuerpo letal.",
              "condicion": null
            },
            {
              "texto": "Para aterrorizar a todos los enemigos en 40 m que puedan presenciarlo.",
              "condicion": null
            },
            {
              "texto": "Solo en escena de combate.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      },
      {
        "tipo": "ventaja",
        "alcance": "dotes_violencia_aterradora",
        "condicion": "¿El ataque que lo desencadenó fue crítico?",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": "ofrecer la acción tras un ataque melee letal que deja a 0 PG; una vez por escena de combate",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_violencia_aterradora"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "dotes_violencia_aterradora"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_alentar",
    "label": "Alentar",
    "grupo": "actitud",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "liderazgo",
        "min": 1
      },
      {
        "tipo": "atributo",
        "id": "caracter",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede expresar unas palabras inspiradoras para alentar a los aliados que puedan escucharle durante una escena de combate, deberá emplear una reacción o una acción simple y una prueba de **expresión + liderazgo** dificultad 7, si tiene éxito los aliados reciben un bonifiador *(sic)* de +1 en tiradas contra efectos de miedo durante toda la escena y pueden relanzar una tirada de salvación contra un efecto de miedo que les esté afectando. Si obtiene éxito crítico en la prueba los aliados reducen en un grado su miedo de forma automática.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_alentar",
          "label": "Alentar",
          "economia": [
            "reaccion",
            "simple"
          ],
          "limite": null,
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "expresion",
            "habilidad": "actitud",
            "especialidad": "liderazgo",
            "dificultad": 7
          },
          "objetivoTira": [],
          "resultados": {
            "exito": {
              "texto": "Los aliados que puedan oírte: +1 a sus tiradas contra efectos de miedo durante toda la escena, y pueden relanzar una salvación contra un efecto de miedo que les esté afectando."
            },
            "critico": {
              "texto": "Además, los aliados reducen su miedo un grado automáticamente."
            }
          },
          "notas": [
            {
              "texto": "En escena de combate; afecta a los aliados que puedan oírte.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_alentar"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_llamada_a_las_armas",
    "label": "Llamada a las Armas",
    "grupo": "actitud",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "liderazgo",
        "min": 3
      },
      {
        "tipo": "atributo",
        "id": "caracter",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Lidera el inicio del combate alentando a sus compañeros que puedan presenciarle y escucharle, en el primer turno de combate como acción gratuita realiza una prueba de **liderazgo + expresión** dificultad 8, un éxito otorga +2 a la siguiente tirada contra miedo, en un éxito crítico además el primer ataque de cada aliado lo hace con ventaja.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_llamada_a_las_armas",
          "label": "Llamada a las armas",
          "economia": "gratuita",
          "limite": null,
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "expresion",
            "habilidad": "actitud",
            "especialidad": "liderazgo",
            "dificultad": 8
          },
          "objetivoTira": [],
          "resultados": {
            "exito": {
              "texto": "Los compañeros que te vean y oigan: +2 a su siguiente tirada contra miedo."
            },
            "critico": {
              "texto": "Además, el primer ataque de cada aliado se hace con ventaja."
            }
          },
          "notas": [
            {
              "texto": "Afecta a los compañeros que puedan verte y oírte.",
              "condicion": null
            },
            {
              "texto": "Solo en el primer turno de combate.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "disponible solo en el primer turno de combate",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_llamada_a_las_armas"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_accion_inspiradora",
    "label": "Acción Inspiradora",
    "grupo": "actitud",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "caracter",
        "min": 2
      },
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "liderazgo",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Si el personaje resuelve con éxito crítico una prueba enfrentada o contra una dificultad de 8 o más, puede realizar como acción gratuita una tirada de **voluntad + liderazgo** para inspirar a los aliados que hayan observado la \"gesta\". La prueba para **inspirar** tiene una dificultad de 7, en caso de éxito sus aliados ganan ventaja en una única tirada que deben realizar durante el próximo minuto. Esta acción inspiradora puede hacerse una vez por escena.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_accion_inspiradora",
          "label": "Acción inspiradora",
          "economia": "gratuita",
          "limite": {
            "veces": 1,
            "por": "escena"
          },
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "voluntad",
            "habilidad": "actitud",
            "especialidad": "liderazgo",
            "dificultad": 7
          },
          "objetivoTira": [],
          "resultados": {
            "exito": {
              "texto": "Los aliados que hayan observado la gesta ganan ventaja en una única tirada que hagan durante el próximo minuto."
            }
          },
          "notas": [
            {
              "texto": "Solo tras un éxito crítico propio en una prueba enfrentada o contra dificultad 8 o más.",
              "condicion": null
            },
            {
              "texto": "Afecta a los aliados que hayan observado la gesta.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "ofrecer la acción tras un crítico propio en enfrentada o contra dificultad 8+; una vez por escena",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_accion_inspiradora"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_cazador_cazado",
    "label": "Cazador Cazado",
    "grupo": "actitud",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "manipulacion",
        "min": 1
      },
      {
        "tipo": "aplicado",
        "id": "perspicacia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede utilizar **perspicacia + manipulación** en lugar de **empatía** para detectar cuando alguien está mintiendo, finjiendo *(sic)* u ocultando sus intenciones.",
    "efectos": [
      {
        "tipo": "cambia_par",
        "alcance": "detectar_mentiras",
        "aplicado": "perspicacia",
        "habilidad": "actitud",
        "especialidad": "manipulacion",
        "condicion": "¿Calando si alguien miente, finge u oculta sus intenciones?",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "detectar_mentiras"
        },
        "mecanismo": "sustitucion_aplicado",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_enredar",
    "label": "Enredar",
    "grupo": "actitud",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "manipulacion",
        "min": 2
      },
      {
        "tipo": "aplicado",
        "id": "expresion",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Aunque el personaje haya sido descubierto en una mentira, puede tratar de enredar el asunto con más mentiras y salir indemne. En tal caso, reduce el penalizador de dificultad en 2 en volver a mentir cuando ha sido descubierto.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "social",
        "valor": 2,
        "condicion": "Vuelve a mentir tras ser descubierto (reduce en 2 el penalizador)",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "social"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_traicionero",
    "label": "Traicionero",
    "grupo": "actitud",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "manipulacion",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "expresion",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Durante una escena social o antes de un combate (pudiendo usarse como tirada de iniciativa), el personaje utiliza una distracción para pillar desprevenido a su rival, debe realizar una prueba de **manipulación + expresión** enfrentada a una de **perspicacia + empatía** del objetivo, en caso de éxito el objetivo está **desprevenido contra el primer ataque**.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_traicionero",
          "label": "Traicionero (distracción)",
          "economia": {
            "tiempo": "durante una escena social o antes de un combate (vale como tirada de iniciativa)"
          },
          "limite": null,
          "resolucion": {
            "tipo": "enfrentada",
            "aplicado": "expresion",
            "habilidad": "actitud",
            "especialidad": "manipulacion"
          },
          "objetivoTira": [
            {
              "que": "Perspicacia + Empatía"
            }
          ],
          "resultados": {
            "exito": {
              "texto": "El objetivo está desprevenido contra el primer ataque: no puede efectuar ninguna acción defensiva contra él."
            }
          },
          "notas": [
            {
              "texto": "Puede usarse como tirada de iniciativa.",
              "condicion": null
            }
          ],
          "grupoExtra": "Iniciativa"
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "acción que puede sustituir a la tirada de iniciativa: pintarla también en el grupo Iniciativa (hoy AccionDote no tiene grupo)",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_traicionero"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_imitacion",
    "label": "Imitación",
    "grupo": "actitud",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "manipulacion",
        "min": 1
      },
      {
        "tipo": "habilidad",
        "id": "interpretacion",
        "min": 1
      },
      {
        "tipo": "atributo",
        "id": "caracter",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede memorizar los gestos, el habla y las actitudes de otra persona para imitarlas con precisión. En caso de imitación gana un bonificador de +2 a su tirada. Si su puntuación de **interpretación** es de 3 o superior el bonificador pasa a ser de +3.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "imitar",
        "valor": {
          "base": 2,
          "siMin": {
            "tipo": "habilidad",
            "id": "interpretacion",
            "min": 3,
            "valor": 3
          }
        },
        "condicion": "Imitando a otra persona",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Con Interpretación 3 o más el bono es +3: la casilla «Imitando a otra persona» ya lo pone.",
        "condicion": null,
        "porque": "sin_regla",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "imitar"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_negociacion_analitica",
    "label": "Negociación Analítica",
    "grupo": "actitud",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "aplicado",
        "id": "perspicacia",
        "min": 2
      },
      {
        "tipo": "especialidad",
        "habilidad": "actitud",
        "id": "negociacion",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje se centra en un método de negociación más analítico y menos emocional, puede utilizar su atributo de **perspicacia** en pruebas de negociación en lugar de **expresión**.",
    "efectos": [
      {
        "tipo": "cambia_par",
        "alcance": "social",
        "aplicado": "perspicacia",
        "condicion": "Negociando: Perspicacia en lugar de Expresión",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "social"
        },
        "mecanismo": "sustitucion_aplicado",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_paso_defensivo",
    "label": "Paso Defensivo",
    "grupo": "atletismo",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "atletismo",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Cuando el personaje obtiene éxito crítico en una **esquiva** puede desplazarse una casilla como acción gratuita una vez por turno.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "defensa",
        "texto": "Con éxito crítico en la esquiva puedes desplazarte una casilla como acción gratuita.",
        "condicion": null,
        "grados": [
          "critico"
        ],
        "porque": "tablero",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "defensa",
        "texto": "Ese desplazamiento, una vez por turno (acción gratuita).",
        "condicion": null,
        "grados": [
          "critico"
        ],
        "porque": "turno",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": "N usos por turno (1 desplazamiento gratuito tras crítico en esquiva)",
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "defensa"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "defensa"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_paso_atras",
    "label": "Paso Atrás",
    "grupo": "atletismo",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "dote",
        "id": "dote_paso_defensivo"
      },
      {
        "tipo": "habilidad",
        "id": "atletismo",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "reflejos",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede emplear una reacción para alejarse una casilla cuando vaya a recibir un ataque melee del que esté prevenido, moviéndose antes de que se resuelva. De esta manera si queda fuera del alcance del atacante lo esquiva de forma automática.\n\nEmplear esta reacción se contabiliza como acción defensiva.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_paso_atras",
          "label": "Paso atrás",
          "economia": "reaccion",
          "limite": null,
          "resolucion": {
            "tipo": "sin_dado"
          },
          "objetivoTira": [],
          "resultados": {
            "exito": {
              "texto": "Te alejas una casilla antes de que se resuelva el ataque melee. Si quedas fuera del alcance del atacante, lo esquivas automáticamente."
            }
          },
          "notas": [
            {
              "texto": "Solo contra un ataque melee del que estés prevenido; te mueves antes de que se resuelva.",
              "condicion": null
            },
            {
              "texto": "Si quedas fuera del alcance del atacante, esquivas el ataque de forma automática.",
              "condicion": null
            },
            {
              "texto": "Cuenta como acción defensiva (acumula el penalizador por acciones defensivas).",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_paso_atras"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_reflejos_felinos",
    "label": "Reflejos Felinos",
    "grupo": "atletismo",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "atletismo",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "reflejos",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Reduce el penalizador por acciones defensivas acumuladas en 1 pero solo en tiradas de **esquiva**.",
    "efectos": [
      {
        "tipo": "descuento_contador",
        "alcance": "defensa",
        "contador": "atacantes_adicionales",
        "unidades": 1,
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "Compensa el contador de atacantes adicionales (tope: no pasa de 0)",
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "defensa"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_balanceo",
    "label": "Balanceo",
    "grupo": "atletismo",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "equilibrio",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Al realizar una tirada de equilibrio sobre una superficie inestable o resbaladizo *(sic)* en caso de obtener fallo se convierte en éxito. Además con esta dote se obtiene un bonificador de +1 en la tiradas *(sic)* para evitar ser derribado.",
    "efectos": [
      {
        "tipo": "sube_grado",
        "alcance": "atletismo",
        "de": "fracaso",
        "a": "exito",
        "condicion": "Tirada de equilibrio sobre superficie inestable o resbaladiza",
        "borrador": 0
      },
      {
        "tipo": "bono",
        "alcance": "atletismo",
        "valor": 1,
        "condicion": "¿Para evitar un derribo?",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "atletismo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "atletismo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_equilibrista",
    "label": "Equilibrista",
    "grupo": "atletismo",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "equilibrio",
        "min": 3
      },
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Cuando el personaje realice una tirada de equilibrio considera el éxito un éxito crítico.",
    "efectos": [
      {
        "tipo": "margen_critico",
        "alcance": "atletismo",
        "valor": 0,
        "condicion": "Tirada de equilibrio",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "atletismo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_como_pez_en_el_agua",
    "label": "Como Pez en el Agua",
    "grupo": "atletismo",
    "coste": 1,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "nado",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Mantenerse a flote en medio acuático se resuelve como acción gratuita, además al moverse nadando en aguas turbulentas el fallo se considera éxito.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "atletismo",
        "texto": "Mantenerse a flote en medio acuático es una acción gratuita.",
        "condicion": "Nadando",
        "porque": "turno",
        "borrador": 0
      },
      {
        "tipo": "sube_grado",
        "alcance": "atletismo",
        "de": "fracaso",
        "a": "exito",
        "condicion": "Moverse nadando en aguas turbulentas",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "atletismo"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "atletismo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_depredador_acuatico",
    "label": "Depredador Acuático",
    "grupo": "atletismo",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "nado",
        "min": 3
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Los ataques melee que emplee el personaje dentro del agua no sufren penalizador de dificultad.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "familia:ataque_melee",
        "valor": 2,
        "condicion": "Dentro del agua",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "No anula la reducción de daño −2 de los golpes contundentes bajo el agua.",
        "condicion": "Dentro del agua",
        "porque": "tercero",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_movilidad",
    "label": "Movilidad",
    "grupo": "atletismo",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "acrobacias",
        "min": 1
      },
      {
        "tipo": "aplicado",
        "id": "reflejos",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Al moverse el personaje omite el primer ataque de oportunidad provocado siempre que esté prevenido del atacante.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Al moverte, ignoras el primer ataque de oportunidad que provoques, siempre que estés prevenido del atacante.",
        "condicion": null,
        "porque": "tercero",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_movilidad_mejorada",
    "label": "Movilidad Mejorada",
    "grupo": "atletismo",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "dote",
        "id": "dote_movilidad"
      },
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "acrobacias",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "reflejos",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": "dote_movilidad",
    "visible": true,
    "texto": "Igual que movilidad pero afecta a todos los posibles ataques de oportunidad durante el movimiento siempre que esté prevenido del atacante.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Al moverte, ignoras todos los ataques de oportunidad que provoques durante el movimiento, siempre que estés prevenido del atacante.",
        "condicion": null,
        "porque": "tercero",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_potencia_de_lanzamiento",
    "label": "Potencia de Lanzamiento",
    "grupo": "atletismo",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "lanzamiento",
        "min": 1
      },
      {
        "tipo": "aplicado",
        "id": "potencia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Considera tu potencia 1 punto superior a la hora de calcular la distancia de lanzamiento.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:lanzar_granada",
        "texto": "Para la distancia de lanzamiento, tu Potencia cuenta 1 más (alcance (Potencia + 1) × 10 m).",
        "condicion": null,
        "porque": "tablero",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:lanzar_melee",
        "texto": "Para la distancia de lanzamiento, tu Potencia cuenta 1 más (alcance (Potencia + 1) × 10 m).",
        "condicion": null,
        "porque": "tablero",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:lanzar_granada"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:lanzar_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_lanzador_preciso",
    "label": "Lanzador Preciso",
    "grupo": "atletismo",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "lanzamiento",
        "min": 2
      },
      {
        "tipo": "aplicado",
        "id": "reflejos",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Omite un nivel de cobertura física al acertar a un objetivo con un ataque de lanzamiento.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:lanzar_granada",
        "texto": "Ignoras un nivel de cobertura física del objetivo.",
        "condicion": null,
        "porque": "tablero",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:lanzar_melee",
        "texto": "Ignoras un nivel de cobertura física del objetivo.",
        "condicion": null,
        "porque": "tablero",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:lanzar_granada"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:lanzar_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_salto_evasivo",
    "label": "Salto Evasivo",
    "grupo": "atletismo",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "salto",
        "min": 2
      },
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "acrobacias",
        "min": 2
      },
      {
        "tipo": "aplicado",
        "id": "reflejos",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El primer éxito en una tirada de esquiva para evitar un área contabiliza doble.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "defensa",
        "valor": 1,
        "condicion": "Esquivando un área",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "defensa"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_salto_evasivo_mejorado",
    "label": "Salto Evasivo Mejorado",
    "grupo": "atletismo",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "salto",
        "min": 4
      },
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "acrobacias",
        "min": 4
      },
      {
        "tipo": "aplicado",
        "id": "reflejos",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": "dote_salto_evasivo",
    "visible": true,
    "texto": "El primer éxito en una tirada de esquiva para evitar un área contabiliza triple.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "defensa",
        "valor": 2,
        "condicion": "Esquivando un área",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "defensa"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_saber_caer",
    "label": "Saber Caer",
    "grupo": "atletismo",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "salto",
        "min": 1
      },
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje reduce en 4 metros la altura efectiva de cualquier caída a efectos de cálculo de daño.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Caídas: la altura efectiva se reduce en 4 m para calcular el daño.",
        "condicion": null,
        "porque": "sin_regla",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_caer_parado",
    "label": "Caer Parado",
    "grupo": "atletismo",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "salto",
        "min": 3
      },
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje reduce en 8 metros la altura efectiva de cualquier caída a efectos de cálculo de daño.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Caídas: la altura efectiva se reduce en 8 m para calcular el daño (no se suma con Saber Caer).",
        "condicion": null,
        "porque": "sin_regla",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_salto_ofensivo",
    "label": "Salto Ofensivo",
    "grupo": "atletismo",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "salto",
        "min": 2
      },
      {
        "tipo": "aplicado",
        "id": "reflejos",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede realizar un ataque melee o a distancia durante un salto de forma simultánea como una única acción, se utiliza la acción más compleja.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "atletismo",
        "texto": "Puedes atacar (melee o a distancia) durante un salto como una sola acción.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "atletismo",
        "texto": "La acción combinada cuesta la más compleja de las dos (salto o ataque).",
        "condicion": null,
        "porque": "turno",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "atletismo"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "atletismo"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_salto_ofensivo_mejorado",
    "label": "Salto Ofensivo Mejorado",
    "grupo": "atletismo",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "salto",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "reflejos",
        "min": 2
      },
      {
        "tipo": "dote",
        "id": "dote_salto_ofensivo"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede realizar un ataque melee o a distancia durante un salto sin penalizador adicional de dificultad.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "familia:ataque_melee",
        "valor": 2,
        "condicion": "Atacando durante un salto",
        "borrador": 0
      },
      {
        "tipo": "bono",
        "alcance": "familia:ataque_fuego",
        "valor": 2,
        "condicion": "Atacando durante un salto",
        "borrador": 1
      },
      {
        "tipo": "bono",
        "alcance": "familia:lanzar_melee",
        "valor": 2,
        "condicion": "Atacando durante un salto",
        "borrador": 2
      },
      {
        "tipo": "bono",
        "alcance": "familia:lanzar_granada",
        "valor": 2,
        "condicion": "Atacando durante un salto",
        "borrador": 3
      },
      {
        "tipo": "bono",
        "alcance": "familia:ataque_pesado",
        "valor": 2,
        "condicion": "Atacando durante un salto",
        "borrador": 4
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:lanzar_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:lanzar_granada"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_pesado"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_agarre_rapido",
    "label": "Agarre Rápido",
    "grupo": "atletismo",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "escalada",
        "min": 1
      },
      {
        "tipo": "aplicado",
        "id": "reflejos",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Una vez por turno el personaje puede emplear una acción gratuita para aferrarse a un asidero tras un salto o en una caída.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_agarre_rapido",
          "label": "Aferrarse a un asidero",
          "economia": "gratuita",
          "limite": {
            "veces": 1,
            "por": "turno"
          },
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "reflejos",
            "habilidad": "atletismo",
            "especialidad": "escalada",
            "dificultad": {
              "manual": "según el asidero (máster)"
            }
          },
          "objetivoTira": [],
          "resultados": {
            "exito": {
              "texto": "Te aferras al asidero."
            },
            "fracaso": {
              "texto": "No consigues agarrarte."
            }
          },
          "notas": [
            {
              "texto": "Solo tras un salto o durante una caída. Necesitas al menos una mano libre.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "1 uso por turno",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_agarre_rapido"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_contacto_a_tres_puntos",
    "label": "Contacto a Tres Puntos",
    "grupo": "atletismo",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "escalada",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede trepar con una mano ocupada sin ninguna penalización, pero la mano ocupada se considera está en uso durante la escalada a no ser que el personaje se pare en una posición y se quede en apoyo con los otros tres puntos.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "escalar",
        "texto": "Puedes trepar con una mano ocupada sin penalización.",
        "condicion": "Trepando con una mano ocupada",
        "porque": "sin_regla",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "escalar",
        "texto": "La mano ocupada cuenta como en uso mientras trepas, salvo que te pares y te apoyes en los otros tres puntos.",
        "condicion": "Trepando con una mano ocupada",
        "porque": "narrativo",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "escalar"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "narrativo",
        "afecta": {
          "modo": "accion_existente",
          "id": "escalar"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_velocista",
    "label": "Velocista",
    "grupo": "atletismo",
    "coste": 1,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "carrera",
        "min": 1
      },
      {
        "tipo": "aplicado",
        "id": "potencia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Al correr como acción estándar o compleja considera el fracaso como éxito y el éxito como éxito crítico.",
    "efectos": [
      {
        "tipo": "sube_grado",
        "alcance": "carrera",
        "de": "fracaso",
        "a": "exito",
        "condicion": null,
        "borrador": 0
      },
      {
        "tipo": "margen_critico",
        "alcance": "carrera",
        "valor": 0,
        "condicion": null,
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "carrera"
        },
        "mecanismo": "siempre_activo",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "carrera"
        },
        "mecanismo": "siempre_activo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_salida_explosiva",
    "label": "Salida Explosiva",
    "grupo": "atletismo",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "carrera",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "potencia",
        "min": 2
      },
      {
        "tipo": "dote",
        "id": "dote_velocista"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede emplear una reacción para moverse la velocidad de su movimiento en carrera.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_salida_explosiva",
          "label": "Salida explosiva",
          "economia": "reaccion",
          "limite": null,
          "resolucion": {
            "tipo": "sin_dado"
          },
          "objetivoTira": [],
          "resultados": {},
          "notas": [
            {
              "texto": "Te mueves tu movimiento de carrera (ver Movimiento).",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_salida_explosiva"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_zafarse",
    "label": "Zafarse",
    "grupo": "atletismo",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "escapismo",
        "min": 2
      },
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Si el personaje está atrapado puede emplear una reacción para tratar de escapar.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_zafarse",
          "label": "Zafarse",
          "economia": "reaccion",
          "limite": null,
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "potencia",
            "habilidad": "atletismo",
            "especialidad": "escapismo",
            "dificultad": {
              "manual": "según lo que te atrapa (máster)"
            }
          },
          "objetivoTira": [],
          "resultados": {
            "exito": {
              "texto": "Te liberas y dejas de estar atrapado."
            },
            "fracaso": {
              "texto": "Sigues atrapado."
            }
          },
          "notas": [
            {
              "texto": "Solo si estás atrapado. Según el caso se tira con Fortaleza en vez de Potencia, o con una maniobra de pelea enfrentada si te atrapa un agarre.",
              "condicion": "Atrapado"
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "mostrar la acción solo con el estado Atrapado activo",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_zafarse"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_especialidad_medica",
    "label": "Especialidad Médica",
    "grupo": "biociencia",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "biociencia",
        "id": "medicina",
        "min": 2
      },
      {
        "tipo": "atributo",
        "id": "inteligencia",
        "min": 1
      }
    ],
    "eleccion": {
      "id": "pareja_afecciones",
      "label": "Pareja de afecciones",
      "opciones": [
        "aturdimiento_confusion",
        "ceguera_sordera",
        "envenenamiento_enfermedad",
        "hemorragia_herida"
      ],
      "etiquetas": {
        "aturdimiento_confusion": "Aturdimiento y confusión",
        "ceguera_sordera": "Ceguera y sordera",
        "envenenamiento_enfermedad": "Envenenamiento y enfermedad",
        "hemorragia_herida": "Hemorragia y herida"
      }
    },
    "repetible": true,
    "sustituye": null,
    "visible": true,
    "texto": "Escoge una de las siguientes parejas de afecciones: aturdimiento y confusión, ceguera y sordera, envenenamiento y enfermedad, hemorragia y herida. Para el par escogido el personaje reduce en 1 la dificultad en tiradas de medicina para su tratamiento. Además, en las afecciones seleccionadas el crítico se consigue con 5éxitos *(sic)* en lugar de 6.\n\nEsta dote puede seleccionarse más veces para distintas afecciones.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "medicina",
        "valor": 1,
        "condicion": "Tratando una afección de la pareja elegida",
        "borrador": 0
      },
      {
        "tipo": "margen_critico",
        "alcance": "medicina",
        "valor": 5,
        "condicion": "Tratando una afección de la pareja elegida",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": "Selector de afección tratada en 'Tratar heridas' que active solo las parejas compradas (una casilla por compra de la dote)",
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "medicina"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "medicina"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_ojo_clinico",
    "label": "Ojo Clínico",
    "grupo": "biociencia",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "biociencia",
        "id": "medicina",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "perspicacia",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede lanzar dos dados y escoger la mejor tirada en pruebas de diagnóstico con el gasto de un punto de fatiga.",
    "efectos": [
      {
        "tipo": "ventaja",
        "alcance": "medicina",
        "condicion": "Prueba de diagnóstico",
        "coste": {
          "fatiga": 1
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "Casilla 'Ventaja (Ojo Clínico, 1 fatiga)' en Tratar heridas que active los dos d12 y descuente la fatiga al confirmar",
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "medicina"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_autocuidados",
    "label": "Autocuidados",
    "grupo": "biociencia",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "biociencia",
        "id": "medicina",
        "min": 3
      },
      {
        "tipo": "habilidad",
        "id": "actitud",
        "min": 2
      },
      {
        "tipo": "aplicado",
        "id": "fortaleza",
        "min": 1
      },
      {
        "tipo": "aplicado",
        "id": "voluntad",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje reduce en 1 la dificultad en salvaciones contra enfermedad y efectos emocionales siempre que no esté fatigado.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "salv_fortaleza",
        "valor": 1,
        "condicion": "Contra enfermedad (no vale si estás fatigado)",
        "borrador": 0
      },
      {
        "tipo": "bono",
        "alcance": "salv_voluntad",
        "valor": 1,
        "condicion": "Contra efectos emocionales (no vale si estás fatigado)",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": "La app ya conoce el umbral Fatigado (FichaResuelta): podría ocultar la casilla sola cuando el personaje esté fatigado o exhausto",
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "salv_fortaleza"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "salv_voluntad"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_optimizacion_biotecnologica_de_traje",
    "label": "Optimización Biotecnológica de Traje",
    "grupo": "biociencia",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "biociencia",
        "id": "biotecnologia",
        "min": 2
      },
      {
        "tipo": "atributo",
        "id": "inteligencia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje es capaz de integrar cultivos enzimáticos y filtros de origen biológico en los sistemas cerrados. El personaje necesita instrumental o una valija, incrementa en un 50% la duración máxima de cualquier nivel de **Soporte Vital** instalado en su armadura o la de sus aliados con el gasto de material común biológico y una prueba de **biotecnología + perspicacia** dificultad 6 de 1 hora de duración.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_optimizar_soporte_vital",
          "label": "Optimizar Soporte Vital",
          "economia": {
            "tiempo": "1 hora"
          },
          "limite": null,
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "perspicacia",
            "habilidad": "biociencia",
            "especialidad": "biotecnologia",
            "dificultad": 6
          },
          "objetivoTira": [],
          "resultados": {
            "exito": {
              "texto": "La duración máxima del Soporte Vital (cualquier nivel) de la armadura elegida, tuya o de un aliado, sube un 50 %."
            }
          },
          "notas": [
            {
              "texto": "Necesitas instrumental o una valija.",
              "condicion": null
            },
            {
              "texto": "Gasta material común biológico.",
              "condicion": null
            },
            {
              "texto": "Integra cultivos enzimáticos y filtros biológicos en los sistemas cerrados del traje.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_optimizar_soporte_vital"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_potenciar_veneno",
    "label": "Potenciar Veneno",
    "grupo": "biociencia",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "biociencia",
        "id": "bioquimica",
        "min": 2
      },
      {
        "tipo": "atributo",
        "id": "inteligencia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Con un laboratorio o una valija, el personaje puede actuar sobre una toxina o veneno para potenciarla. Es preciso emplear material común biológico y realizar una prueba de **perspicacia + bioquímica** dificultad 5 + nivel de la toxina con un duración de 10 minutos, si tiene éxito aumenta en un nivel el tóxico, si obtiene éxito crítico aumenta en dos niveles. En caso de fracaso el veneno se echa a perder y se pierde.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_potenciar_veneno",
          "label": "Potenciar veneno",
          "economia": {
            "tiempo": "10 minutos"
          },
          "limite": null,
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "perspicacia",
            "habilidad": "biociencia",
            "especialidad": "bioquimica",
            "dificultad": {
              "manual": "5 + nivel de la toxina"
            }
          },
          "objetivoTira": [],
          "resultados": {
            "critico": {
              "texto": "La toxina sube dos niveles."
            },
            "exito": {
              "texto": "La toxina sube un nivel."
            },
            "fracaso": {
              "texto": "El veneno se echa a perder y se pierde."
            }
          },
          "notas": [
            {
              "texto": "Necesitas un laboratorio o una valija.",
              "condicion": null
            },
            {
              "texto": "Gasta material común biológico.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_potenciar_veneno"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_artesano_bionico",
    "label": "Artesano Biónico",
    "grupo": "biociencia",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "biociencia",
        "id": "bionica",
        "min": 3
      },
      {
        "tipo": "atributo",
        "id": "inteligencia",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje reduce en 1 la dificultad de fabricación y reparación de implantes biónicos y su coste en un 10%.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "−1 a la dificultad de fabricar y reparar implantes biónicos.",
        "condicion": null,
        "porque": "area_sin_construir",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Fabricar y reparar implantes biónicos cuesta un 10 % menos.",
        "condicion": null,
        "porque": "area_sin_construir",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_gran_maestro_bionico",
    "label": "Gran Maestro Biónico",
    "grupo": "biociencia",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "biociencia",
        "id": "bionica",
        "min": 6
      },
      {
        "tipo": "dote",
        "id": "dote_artesano_bionico"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje reduce el coste para fabricación y reparación de implantes biónicos en un 15%, en caso de éxito crítico lo reduce en un 25%.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Fabricar y reparar implantes biónicos cuesta un 15 % menos (sustituye al 10 % de Artesano Biónico).",
        "condicion": null,
        "porque": "area_sin_construir",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Con éxito crítico en la fabricación o reparación, el coste baja un 25 %.",
        "condicion": "Éxito crítico al fabricar o reparar un implante biónico",
        "porque": "area_sin_construir",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_genio_genetista",
    "label": "Genio Genetista",
    "grupo": "biociencia",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "biociencia",
        "id": "ingenieria_genetica",
        "min": 3
      },
      {
        "tipo": "atributo",
        "id": "inteligencia",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje reduce en 1 la dificultad para realizar aumentos genéticos y su coste en un 10%.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "−1 a la dificultad para realizar aumentos genéticos.",
        "condicion": null,
        "porque": "area_sin_construir",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Realizar aumentos genéticos cuesta un 10 % menos.",
        "condicion": null,
        "porque": "area_sin_construir",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_gran_genio_genetista",
    "label": "Gran Genio Genetista",
    "grupo": "biociencia",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "biociencia",
        "id": "ingenieria_genetica",
        "min": 6
      },
      {
        "tipo": "dote",
        "id": "dote_genio_genetista"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje reduce el coste para realizar aumentos genéticos en un 15%, en caso de éxito crítico lo reduce en un 25%.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Realizar aumentos genéticos cuesta un 15 % menos (sustituye al 10 % de Genio Genetista).",
        "condicion": null,
        "porque": "area_sin_construir",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Con éxito crítico al realizar el aumento, el coste baja un 25 %.",
        "condicion": "Éxito crítico al realizar un aumento genético",
        "porque": "area_sin_construir",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_bloqueo",
    "label": "Bloqueo",
    "grupo": "combate_melee",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El bloqueo es una acción defensiva que unicamente *(sic)* es válida contra ataques melee.\n\nCuando un personaje bloquea, utiliza un escudo, un arma melee o circunstancialmente su propio cuerpo para detener un ataque melee en su contra, si tiene éxito, desvía el ataque, pero si supera con éxito crítico a su atacante, podrá realizar un contraataque como reacción contra este. El contraataque solo puede ser de combate melee y solo podrá ser empleado si tiene el alcance adecuado.\n\nLa tirada empleada para el bloqueo es la misma de ataque del escudo o arma utilizada para parar el golpe, ciertos ataques pueden causar daños o efectos al tratar de ser bloqueados incluso cuando se tenga éxito en la acción defensiva.\n\n**Regla incluida en la dote (no es efecto de la dote):**\nSe aplican los factores circunstanciales habituales:\n\n- **Tamaño del atacante:** Por cada tamaño de diferencia entre atacante y quien bloquea, se aplica un modificador de dificultad:\n  - Por cada **tamaño mayor del atacante**, quien bloquea recibe un penalizador de dificultad de **-2**.\n  - Por cada **tamaño menor del atacante**, quien bloquea recibe una *(sic)* bonificador de **+1**.\n- Si el defensor esta *(sic)* **desarmado frente a un atacante armado**, recibe un penalizador de **-3** en su acción de bloqueo. Si el ataque natural o desarmado de quien bloquea causa **daño letal no se considera desarmado** y no se tiene en cuenta esta penalización.",
    "efectos": [
      {
        "tipo": "habilita",
        "accion": "familia:bloquear_melee",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:bloquear_melee",
        "texto": "Solo vale contra ataques melee.",
        "condicion": null,
        "porque": "tercero",
        "borrador": 1
      },
      {
        "tipo": "texto",
        "lugar": "familia:bloquear_melee",
        "texto": "Si superas al atacante con crítico, puedes contraatacarle como reacción.",
        "condicion": null,
        "grados": [
          "critico"
        ],
        "porque": "turno",
        "borrador": 2
      },
      {
        "tipo": "texto",
        "lugar": "familia:bloquear_melee",
        "texto": "El contraataque solo puede ser melee y solo si tienes el alcance adecuado.",
        "condicion": null,
        "grados": [
          "critico"
        ],
        "porque": "tablero",
        "borrador": 3
      },
      {
        "tipo": "texto",
        "lugar": "familia:bloquear_melee",
        "texto": "Ciertos ataques pueden causar daño o efectos al ser bloqueados aunque el bloqueo tenga éxito.",
        "condicion": null,
        "porque": "tercero",
        "borrador": 4
      },
      {
        "tipo": "texto",
        "lugar": "familia:bloquear_melee",
        "texto": "Atacante más grande: −2 por cada tamaño de diferencia.",
        "condicion": null,
        "porque": "tablero",
        "borrador": 5
      },
      {
        "tipo": "texto",
        "lugar": "familia:bloquear_melee",
        "texto": "Atacante más pequeño: +1 por cada tamaño de diferencia.",
        "condicion": null,
        "porque": "tablero",
        "borrador": 6
      },
      {
        "tipo": "bono",
        "alcance": "familia:bloquear_melee",
        "valor": -3,
        "condicion": "Desarmado frente a atacante armado",
        "filtroArma": {
          "desarmado": true
        },
        "borrador": 7
      },
      {
        "tipo": "texto",
        "lugar": "familia:bloquear_melee",
        "texto": "Si tu ataque natural o desarmado hace daño letal no cuentas como desarmado: no marques la casilla.",
        "condicion": "Desarmado frente a atacante armado",
        "porque": "tercero",
        "filtroArma": {
          "desarmado": true
        },
        "borrador": 8
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "habilitador",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "gate_instalacion",
        "arbitraje": "duro",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_contraataque_rapido",
    "label": "Contraataque Rápido",
    "grupo": "combate_melee",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 1
      },
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 3
      },
      {
        "tipo": "dote",
        "id": "dote_bloqueo"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Cuando el personaje bloquea un ataque melee y está en condición de contraatacar, en lugar de gastar una reacción emplea una acción gratuita. Solo se puede emplear este contraataque gratuito una vez por turno.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:bloquear_melee",
        "texto": "Contraataque como acción gratuita en vez de reacción, una vez por turno.",
        "condicion": null,
        "grados": [
          "critico"
        ],
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "N usos por turno: contraataque gratuito 1/turno",
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_maestro_en_contraataque",
    "label": "Maestro en Contraataque",
    "grupo": "combate_melee",
    "coste": 8,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 2
      },
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 6
      },
      {
        "tipo": "dote",
        "id": "dote_contraataque_rapido"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": "dote_contraataque_rapido",
    "visible": true,
    "texto": "Cada vez que bloquea con éxito crítico un ataque melee y está en posición de contraatacar lo hace como acción gratuita, por lo que tiene contraataques ilimitados.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:bloquear_melee",
        "texto": "Contraataque como acción gratuita, sin límite por turno.",
        "condicion": null,
        "grados": [
          "critico"
        ],
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_combate_sutil",
    "label": "Combate Sutil",
    "grupo": "combate_melee",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 1
      },
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Puedes utilizar el atributo de **reflejos** en lugar de potencia para armas o ataques clasificadas como **sutiles**.",
    "efectos": [
      {
        "tipo": "cambia_par",
        "alcance": "familia:ataque_melee",
        "aplicado": "reflejos",
        "condicion": "Sutil",
        "borrador": 0
      },
      {
        "tipo": "cambia_par",
        "alcance": "familia:bloquear_melee",
        "aplicado": "reflejos",
        "condicion": "Sutil",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "sustitucion_aplicado",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "sustitucion_aplicado",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_ataque_de_oportunidad",
    "label": "Ataque de Oportunidad",
    "grupo": "combate_melee",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Si un enemigo se mueve dentro del alcance melee de un personaje, este puede emplear una reacción para realizar un ataque de oportunidad. El ataque escogido tiene que ser uno que emplee una acción simple normalmente.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_ataque_de_oportunidad",
          "label": "Ataque de oportunidad",
          "economia": "reaccion",
          "limite": null,
          "resolucion": {
            "tipo": "sin_dado"
          },
          "objetivoTira": [],
          "resultados": {},
          "notas": [
            {
              "texto": "Cuando un enemigo se mueve dentro de tu alcance melee.",
              "condicion": null
            },
            {
              "texto": "Ataca con 'Golpear con X' usando un modo que normalmente sea acción simple.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "Lanzar desde esta acción el Golpear con X filtrado a modos Simple",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_ataque_de_oportunidad"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_ataque_de_oportunidad_poderoso",
    "label": "Ataque de Oportunidad Poderoso",
    "grupo": "combate_melee",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 3
      },
      {
        "tipo": "atributo",
        "id": "fuerza",
        "min": 1
      },
      {
        "tipo": "dote",
        "id": "dote_ataque_de_oportunidad"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Puede realizar un ataque estándar en un ataque de oportunidad.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "dotes_ataque_de_oportunidad",
        "texto": "Puedes usar un ataque de modo Estándar en el ataque de oportunidad.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "dotes_ataque_de_oportunidad"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_ataque_de_oportunidad_multiple",
    "label": "Ataque de Oportunidad Múltiple",
    "grupo": "combate_melee",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 3
      },
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 1
      },
      {
        "tipo": "dote",
        "id": "dote_ataque_de_oportunidad"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Puedes realizar un ataque de oportunidad por turno como acción gratuita.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "dotes_ataque_de_oportunidad",
        "texto": "Un ataque de oportunidad por turno como acción gratuita, sin gastar la reacción.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "N usos por turno: ataque de oportunidad gratuito 1/turno",
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "dotes_ataque_de_oportunidad"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_maestro_oportunista",
    "label": "Maestro Oportunista",
    "grupo": "combate_melee",
    "coste": 8,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 6
      },
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 2
      },
      {
        "tipo": "dote",
        "id": "dote_ataque_de_oportunidad_multiple"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": "dote_ataque_de_oportunidad_multiple",
    "visible": true,
    "texto": "Los ataques de oportunidad del personaje se resuelven como acción gratuita por lo que son ilimitados.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "dotes_ataque_de_oportunidad",
        "texto": "Tus ataques de oportunidad son acción gratuita, sin límite.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "dotes_ataque_de_oportunidad"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_arrollar",
    "label": "Arrollar",
    "grupo": "combate_melee",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "fuerza",
        "min": 2
      },
      {
        "tipo": "especialidad",
        "habilidad": "combate_melee",
        "id": "pelea",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "La maniobra de arrollar es una acción de tipo **compleja** que implica movimiento y que solo se podrá realizar siempre y cuando el personaje pueda desplazarse para recorrer al menos una distancia de **10 metros**, en la distancia recorrida nunca se puede efectuar un cambio de sentido, solo de dirección, no pudiendo retroceder a las posiciones que se dejan atrás.\n\nLa maniobra permite atravesar una zona donde hay un objetivo o varios, puediendo *(sic)* incluso atacarles.\n\nAl hacer esta maniobra el personaje puede desplazarse la mitad de su movimiento básico (redondeo a la alta) pasando por encima de la casilla de un objetivo o varios. Si el terreno es difícil y le obliga a moverse a velocidad reducida no podrá realizar la maniobra en ese espacio, si se encuentra un obstáculo, este se considera objetivo y solo podrá realizarla si es capaz de destruir o derribar el obstáculo con la maniobra.\n\nDeberá realizar una tirada de ataque con el atributo de **potencia**. El resultado total será la dificultad que tienen los objetivos para evitar la maniobra y sus consecuencias, como cualquier ataque melee puede ser bloqueado o esquivado.\n\nEn caso de que la maniobra funcione con éxito crítico el objetivo recibe un **derribo** con su consecuente tirada de **potencia + atletismo** para evitarlo, aunque tenga éxito deberá apartarse de la trayectoria del atacante y este podrá continuar su marcha. Si el atacante posee alguna dote que mejore su derribo se aplica de forma automática.\n\nEn caso de maniobra exitosa el personaje puede continuar su movimiento por la casilla del objetivo y desplazarlo a una posición lateral adyacente sin hacerle daño ni derribarle, pero si no hubiese casillas adyacentes a las que desplazarse (como en un un *(sic)* pasillo estrecho) el objetivo quedaría derribado en su casilla aunque sin recibir daño.\n\nSi por el contrario la maniobra fracasa el atacante no podrá atravesar esa casilla dando por terminada la maniobra.\n\nSi fracasa de manera crítica el atacante cae derribado.\n\nA partir del primer objetivo en el trayecto, cada siguiente objetivo adicional gana un bonificador de +1 en su tirada defensiva contra la maniobra. Esta maniobra provoca ataque de oportunidad de la forma habitual.\n\nLos obstáculos se considera que siempre son acertados de manera crítica de tal manera que reciben el daño y pueden ser apartados a una casilla adyacente según naturaleza del objeto y criterio del narrador. Si el narrador ve inverosímil que el objeto sea apartado por sus características o las del terreno, el personaje podrá atravesarlo solo en caso de que le hiciese el suficiente daño como para destruirlo.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_arrollar",
          "label": "Arrollar",
          "economia": "compleja",
          "limite": null,
          "resolucion": {
            "tipo": "ataque",
            "aplicado": "potencia",
            "habilidad": "combate_melee",
            "especialidad": "pelea"
          },
          "objetivoTira": [
            {
              "que": "Esquiva o bloqueo contra tu resultado total (es su dificultad). Cada objetivo después del primero tiene +1 a su tirada defensiva."
            },
            {
              "que": "Si sacas crítico: Potencia + Atletismo para evitar el derribo",
              "grados": {
                "exito": "No cae, pero se aparta de tu trayectoria y sigues."
              }
            }
          ],
          "resultados": {
            "critico": {
              "texto": "El objetivo recibe un derribo (tira Potencia + Atletismo para evitarlo; aunque lo evite, se aparta y sigues). Tus dotes que mejoran el derribo se aplican solas."
            },
            "exito": {
              "texto": "Sigues por su casilla y lo desplazas a una casilla lateral adyacente, sin daño ni derribo. Si no hay hueco lateral (pasillo estrecho), queda derribado en su casilla, sin daño."
            },
            "fracaso": {
              "texto": "No atraviesas esa casilla; la maniobra termina."
            },
            "fracasoCritico": {
              "texto": "Caes derribado."
            }
          },
          "notas": [
            {
              "texto": "Necesitas poder recorrer al menos 10 m. Sin cambios de sentido (sí de dirección) ni volver a casillas que dejas atrás.",
              "condicion": null
            },
            {
              "texto": "Te desplazas la mitad de tu movimiento básico (redondeando arriba) pasando por las casillas de uno o varios objetivos, y puedes atacarles.",
              "condicion": null
            },
            {
              "texto": "No se puede en terreno difícil que obligue a ir a velocidad reducida.",
              "condicion": null
            },
            {
              "texto": "Un obstáculo cuenta como objetivo: solo pasas si lo destruyes o derribas. Los obstáculos se aciertan siempre con crítico: reciben el daño y pueden apartarse a una casilla adyacente a criterio del narrador; si no es verosímil apartarlo, solo pasas si lo destruyes.",
              "condicion": null
            },
            {
              "texto": "Provoca ataques de oportunidad como de costumbre.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_arrollar"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_apresar_y_apunalar",
    "label": "Apresar y Apuñalar",
    "grupo": "combate_melee",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Al realizar una presa con éxito llevando un arma de una sola mano se gana una reacción para atacar con esta.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Tras una presa con éxito, si llevas esta arma de una mano, ganas una reacción para atacar con ella.",
        "condicion": null,
        "porque": "turno",
        "filtroArma": {
          "empleo": "una mano"
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "Reacción extra tras presa: contador de reacciones disponibles",
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_ataque_melee_doble",
    "label": "Ataque Melee Doble",
    "grupo": "combate_melee",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Si el personaje lleva un arma melee en cada mano, puede efectuar un ataque con ambas como acción estándar, para ello debe llevar a cabo ataques que normalmente se resuelvan como acción simple. Ambos ataques deben ir destinados a un mismo objetivo que esté dentro de su alcance, cada ataque aumenta su dificultad en 1, se resuelve cada tirada por separado así como el daño.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Con un arma melee en cada mano: un ataque con cada una como acción estándar, ambos con modos que normalmente sean acción simple.",
        "condicion": "Ataque doble",
        "porque": "turno",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Los dos ataques al mismo objetivo, dentro de tu alcance.",
        "condicion": "Ataque doble",
        "porque": "tablero",
        "borrador": 1
      },
      {
        "tipo": "bono",
        "alcance": "familia:ataque_melee",
        "valor": -1,
        "condicion": "Ataque doble",
        "borrador": 2
      }
    ],
    "limite": null,
    "candidataUX": "Botón de ataque doble que monte las dos tiradas (una por arma) con su casilla marcada",
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_combate_con_dos_armas_melee",
    "label": "Combate con Dos Armas Melee",
    "grupo": "combate_melee",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "dote",
        "id": "dote_ataque_melee_doble"
      },
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 3
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Cuando se utilizan dos armas cuerpo a cuerpo, se puede combinar una acción estándar y una simple en lugar de dos simples para el ataque doble.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "En el ataque doble puedes combinar un ataque de modo Estándar y uno Simple, en vez de dos Simples.",
        "condicion": "Ataque doble",
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_combinacion",
    "label": "Combinación",
    "grupo": "combate_melee",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede utilizar una acción compleja para efectuar tres ataques melee, todos ellos reciben un penalizador de dificultad de -1, el tercer ataque irá precedido de dos ataques melee de cualquier tipo pero en él solo podrá emplear armas sutiles o golpes de pelea, en contrapartida, el atacante también recibe un penalizador en acciones defensivas de -1 hasta el comienzo de su siguiente turno.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_combinacion",
          "label": "Combinación",
          "economia": "compleja",
          "limite": null,
          "resolucion": {
            "tipo": "sin_dado"
          },
          "objetivoTira": [],
          "resultados": {},
          "notas": [
            {
              "texto": "Tres ataques melee con una sola acción compleja: tira cada uno desde su arma marcando «Combinación» (−1).",
              "condicion": null
            },
            {
              "texto": "El tercer ataque, tras dos ataques melee de cualquier tipo, solo con armas sutiles o golpes de pelea.",
              "condicion": null
            },
            {
              "texto": "Hasta el comienzo de tu siguiente turno, −1 en acciones defensivas (lo recuerda la nota de Esquiva y de Bloquear).",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      },
      {
        "tipo": "bono",
        "alcance": "familia:ataque_melee",
        "valor": -1,
        "condicion": "Combinación",
        "borrador": 1
      },
      {
        "tipo": "texto",
        "lugar": "grupo:Defensa",
        "texto": "Si este turno has usado Combinación: −1 a tus acciones defensivas hasta el comienzo de tu siguiente turno.",
        "condicion": null,
        "porque": "turno",
        "borrador": 2
      },
      {
        "tipo": "texto",
        "lugar": "familia:bloquear_melee",
        "texto": "Si este turno has usado Combinación: −1 a tus acciones defensivas hasta el comienzo de tu siguiente turno.",
        "condicion": null,
        "porque": "turno",
        "borrador": 2
      }
    ],
    "limite": null,
    "candidataUX": "una acción compleja que encadena tres tiradas de ataque melee (la tercera, solo sutil o pelea) en vez de tres tiradas sueltas con su casilla",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_combinacion"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "grupo:Defensa"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_combinacion_rapida",
    "label": "Combinación Rápida",
    "grupo": "combate_melee",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 2
      },
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 2
      },
      {
        "tipo": "dote",
        "id": "dote_combinacion"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "La **combinación** elimina sus penalizadores en acciones defensivas y ofensivas siempre que se utilice el modo de **combate sutil**.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "familia:ataque_melee",
        "valor": 1,
        "condicion": "Combinación en modo sutil",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "grupo:Defensa",
        "texto": "Combinación en modo sutil: sin el −1 a tus acciones defensivas.",
        "condicion": null,
        "porque": "turno",
        "borrador": 1
      },
      {
        "tipo": "texto",
        "lugar": "familia:bloquear_melee",
        "texto": "Combinación en modo sutil: sin el −1 a tus acciones defensivas.",
        "condicion": null,
        "porque": "turno",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "grupo:Defensa"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:bloquear_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_critico_mejorado",
    "label": "Crítico Mejorado",
    "grupo": "combate_melee",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "uno_de",
        "opciones": [
          {
            "tipo": "habilidad",
            "id": "combate_melee",
            "min": 3
          },
          {
            "tipo": "habilidad",
            "id": "combate_distancia",
            "min": 3
          }
        ]
      }
    ],
    "eleccion": {
      "id": "especialidad_arma",
      "label": "Especialidad de arma",
      "opciones": "especialidades_arma"
    },
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje escoge una de sus especializaciones en armas para la habilidad con la que cumpla el requisito, en ataques con armas de esa especialidad el crítico sucede con 5 éxitos en lugar de 6.",
    "efectos": [
      {
        "tipo": "margen_critico",
        "alcance": "especialidad:<elegida>",
        "valor": 5,
        "condicion": null,
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "especialidad:<elegida>"
        },
        "mecanismo": "siempre_activo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_derribo_mejorado",
    "label": "Derribo Mejorado",
    "grupo": "combate_melee",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Al efectuar un derribo con éxito el objetivo pierde 1 punto de fatiga, en caso de que fracase criticamente *(sic)* su salvación además pasa a estar aturdido hasta el final de su próximo turno.",
    "efectos": [
      {
        "tipo": "maniobra",
        "maniobra": "derribo",
        "alcance": "familia:ataque_melee",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Derribo con éxito: el objetivo pierde 1 punto de fatiga.",
        "condicion": "Derribo",
        "porque": "tercero",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Si el objetivo saca fracaso crítico en su tirada contra el derribo, además queda aturdido hasta el final de su próximo turno.",
        "condicion": "Derribo",
        "porque": "tercero",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "habilitador",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "arbitraje": "duro",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_derribo_brutal",
    "label": "Derribo Brutal",
    "grupo": "combate_melee",
    "coste": 5,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "fuerza",
        "min": 2
      },
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 3
      },
      {
        "tipo": "dote",
        "id": "dote_derribo_mejorado"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El aumento de dificultad para derribo causando daño se anula, si se utiliza una acción estandar *(sic)* para derribar el daño el *(sic)* se resuelve como un ataque normal con el posible aumento por la acumulación de éxitos.",
    "efectos": [
      {
        "tipo": "maniobra",
        "maniobra": "derribo",
        "alcance": "familia:ataque_melee",
        "sinPenalizador": true,
        "borrador": 0
      },
      {
        "tipo": "danio_por_exitos",
        "alcance": "familia:ataque_melee",
        "condicion": "Derribo con acción estándar",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_desenfundado_rapido",
    "label": "Desenfundado Rápido",
    "grupo": "combate_melee",
    "coste": 1,
    "requisitos": [
      {
        "tipo": "uno_de",
        "opciones": [
          {
            "tipo": "habilidad",
            "id": "combate_distancia",
            "min": 1
          },
          {
            "tipo": "habilidad",
            "id": "combate_melee",
            "min": 1
          }
        ]
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "La dote sirve para armas que se puedan utilizar a una mano, se aplica en las armas con las que cumpla el requisito.\n\nEl personaje puede desenfundar un arma y hacer un ataque simple como parte de la misma acción, si es el primer disparo contra un objetivo y el atacante actúa primero el objetivo estará sorprendido contra ese ataque.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Armas a una mano: puedes desenfundar y hacer un ataque simple en la misma acción.",
        "condicion": null,
        "porque": "turno",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_melee",
          "min": 1
        },
        "filtroArma": {
          "empleo": "una mano"
        },
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_fuego",
        "texto": "Armas a una mano: puedes desenfundar y hacer un ataque simple en la misma acción.",
        "condicion": null,
        "porque": "turno",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_distancia",
          "min": 1
        },
        "filtroArma": {
          "empleo": "una mano"
        },
        "borrador": 1
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Si es tu primer ataque contra este objetivo y actúas antes que él, está sorprendido contra este ataque.",
        "condicion": "Desenfundando, primer ataque y actúas antes",
        "porque": "tercero",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_melee",
          "min": 1
        },
        "filtroArma": {
          "empleo": "una mano"
        },
        "borrador": 2
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_fuego",
        "texto": "Si es tu primer disparo contra este objetivo y actúas antes que él, está sorprendido contra este ataque.",
        "condicion": "Desenfundando, primer disparo y actúas antes",
        "porque": "tercero",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_distancia",
          "min": 1
        },
        "filtroArma": {
          "empleo": "una mano"
        },
        "borrador": 3
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_defensa_con_escudo_rapida",
    "label": "Defensa con Escudo Rápida",
    "grupo": "combate_melee",
    "coste": 1,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "combate_melee",
        "id": "escudos",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede emplear una reacción para levantar el escudo en lugar de una acción simple.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:levantar_escudo",
        "texto": "Puedes levantar el escudo con una reacción en vez de una acción simple.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:levantar_escudo"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_golpe_mejorado_con_escudo",
    "label": "Golpe Mejorado con Escudo",
    "grupo": "combate_melee",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "combate_melee",
        "id": "escudos",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje causa daño letal al golpear con el escudo si así lo desea.",
    "efectos": [
      {
        "tipo": "categoria_danio",
        "alcance": "familia:ataque_melee",
        "a": "letal",
        "condicion": "Golpe letal",
        "filtroArma": {
          "especialidad": "escudos"
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_defensa_con_escudo_constante",
    "label": "Defensa con Escudo Constante",
    "grupo": "combate_melee",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "combate_melee",
        "id": "escudos",
        "min": 4
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede emplear una acción gratuita para levantar el escudo contra cualquier ataque que no esté desprevenido.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:levantar_escudo",
        "texto": "Puedes levantar el escudo con una acción gratuita contra cualquier ataque, salvo si estás desprevenido.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:levantar_escudo"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_maestro_del_escudo",
    "label": "Maestro del Escudo",
    "grupo": "combate_melee",
    "coste": 8,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "combate_melee",
        "id": "escudos",
        "min": 6
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje aumenta en 1 el beneficio de cobertura que otorga el escudo al levantarlo.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:levantar_escudo",
        "texto": "+1 a la cobertura del escudo en alto (el atacante la suma a su dificultad).",
        "condicion": null,
        "porque": "tercero",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:levantar_escudo"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_golpea_primero_golpea_dos_veces",
    "label": "Golpea Primero, Golpea Dos Veces",
    "grupo": "combate_melee",
    "coste": 1,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Si en el primer turno del combate actúas antes que un enemigo ese turno tienes una acción simple adicional para un golpe melee simple.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "grupo:Iniciativa",
        "texto": "Si en el primer turno del combate actúas antes que un enemigo, ese turno tienes una acción simple adicional para un golpe melee simple.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "acción simple extra el primer turno (registro de acciones por turno)",
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "grupo:Iniciativa"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_finta",
    "label": "Finta",
    "grupo": "combate_melee",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 1
      },
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Como acción simple o reacción realizas una tirada de **expresión + combate melee** para engañar a un enemigo con un gesto de ataque o de movimiento, el enemigo hará una tirada enfrentada de **alerta.** Si la finta tiene **éxito** puedes realizar un ataque melee en tu siguiente acción contra el enemigo estando **sorprendido**, si tiene **éxito crítico** el enemigo pasa a estar **desprevenido**. Un **fracaso crítico** en la tirada **provoca ataque de oportunidad**.\n\nTras la primera finta contra un enemigo, las siguientes acciones de finta contra ese mismo enemigo tienen un penalizador de dificultad de -2.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_finta",
          "label": "Finta",
          "economia": [
            "simple",
            "reaccion"
          ],
          "limite": null,
          "resolucion": {
            "tipo": "enfrentada",
            "aplicado": "expresion",
            "habilidad": "combate_melee"
          },
          "objetivoTira": [
            {
              "que": "Alerta (Perspicacia + Exploración), enfrentada; el empate lo gana él"
            }
          ],
          "resultados": {
            "exito": {
              "texto": "Tu siguiente acción puede ser un ataque melee contra este enemigo, que estará sorprendido."
            },
            "critico": {
              "texto": "El enemigo pasa a estar desprevenido."
            },
            "fracasoCritico": {
              "texto": "Provocas un ataque de oportunidad."
            }
          },
          "notas": []
        },
        "borrador": 0
      },
      {
        "tipo": "bono",
        "alcance": "dotes_finta",
        "valor": -2,
        "condicion": "Finta repetida contra el mismo enemigo",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": "penalizador por objetivo repetido: contador de fintas por enemigo en vez de casilla",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_finta"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "dotes_finta"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_maestro_de_fintas",
    "label": "Maestro de Fintas",
    "grupo": "combate_melee",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 2
      },
      {
        "tipo": "aplicado",
        "id": "expresion",
        "min": 1
      },
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 3
      },
      {
        "tipo": "dote",
        "id": "dote_finta"
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "No se obtiene penalizador en las siguientes acciones de finta contra un mismo enemigo previamente engañado por la maniobra.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "dotes_finta",
        "valor": 2,
        "condicion": "Finta repetida contra un enemigo ya engañado",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "estado por objetivo ('ya fintado'): la app podría recordar contra quién se ha fintado en vez de un interruptor",
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "dotes_finta"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_golpe_fatigante",
    "label": "Golpe Fatigante",
    "grupo": "combate_melee",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Golpea al cuerpo con un ataque que provoque daño contundente o con un arma a dos manos, la intención no es solo dañar sino cansar a tu adversario, reduce el daño en 1 pero si el golpe tiene éxito el rival debe llevar a cabo una tirada de salvación de **fortaleza + atletismo** enfrentada al resultado del ataque original.\n\n- Éxito: Ningún Efecto.\n- Fracaso: Pierde 1 punto de fatiga.\n- Fracaso Crítico: Pierde 1 punto de fatiga y durante su siguiente turno sufrira *(sic)* **asifxia** *(sic)* grado 1.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "familia:ataque_melee",
        "valor": -1,
        "condicion": "Golpe fatigante",
        "sobre": "danio",
        "filtroArma": {
          "empleo": "dos manos",
          "tipoDanio": [
            "contundente"
          ]
        },
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Si el golpe tiene éxito, el rival tira una salvación de Fortaleza + Atletismo enfrentada al resultado de tu ataque. Éxito: sin efecto. Fracaso: pierde 1 punto de fatiga. Fracaso crítico: pierde 1 punto de fatiga y durante su siguiente turno sufre asfixia grado 1.",
        "condicion": "Golpe fatigante",
        "porque": "tercero",
        "filtroArma": {
          "empleo": "dos manos",
          "tipoDanio": [
            "contundente"
          ]
        },
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_asalto_sigiloso",
    "label": "Asalto Sigiloso",
    "grupo": "combate_melee",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 1
      },
      {
        "tipo": "habilidad",
        "id": "sigilo",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Como parte de la misma acción el personaje puede acercarse en sigilo hasta alcanzar a un objetivo y atacarle gastando una reacción.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "sigilo",
        "texto": "Como parte de la misma acción puedes acercarte en sigilo hasta alcanzar a un objetivo y atacarle gastando tu reacción.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "coste en acciones: moverse en sigilo y atacar con la reacción en la misma acción (registro de acciones por turno)",
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "sigilo"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_asesino",
    "label": "Asesino",
    "grupo": "combate_melee",
    "coste": 5,
    "requisitos": [
      {
        "tipo": "uno_de",
        "opciones": [
          {
            "tipo": "habilidad",
            "id": "combate_melee",
            "min": 2
          },
          {
            "tipo": "habilidad",
            "id": "combate_distancia",
            "min": 2
          }
        ]
      },
      {
        "tipo": "habilidad",
        "id": "sigilo",
        "min": 3
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Si el personaje ataca a un objetivo sorprendido o desprevenido, segundos ataques mantienen la condición de sorpresivo. Esto solo se aplicará si el personaje utiliza un estilo de combate (melee o distancia) con el que cumpla los requisitos para la dote.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Si atacas a un objetivo sorprendido o desprevenido, tus ataques siguientes mantienen la condición de sorpresa. Solo con Combate Melee 2.",
        "condicion": "Objetivo sorprendido o desprevenido",
        "porque": "tercero",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_melee",
          "min": 2
        },
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_fuego",
        "texto": "Si atacas a un objetivo sorprendido o desprevenido, tus ataques siguientes mantienen la condición de sorpresa. Solo con Combate a Distancia 2.",
        "condicion": "Objetivo sorprendido o desprevenido",
        "porque": "tercero",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_distancia",
          "min": 2
        },
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_mata_gigantes",
    "label": "Mata Gigantes",
    "grupo": "combate_melee",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 3
      },
      {
        "tipo": "atributo",
        "id": "fuerza",
        "min": 4
      },
      {
        "tipo": "especialidad",
        "habilidad": "exploracion",
        "id": "tactica",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje se considera un tamaño superior cuando realiza maniobras contra enemigos de mayor tamaño.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Cuando haces maniobras contra un enemigo de mayor tamaño, cuentas como si fueras un tamaño mayor.",
        "condicion": "Maniobra contra un enemigo de mayor tamaño",
        "porque": "tablero",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_golpe_entorpecedor",
    "label": "Golpe Entorpecedor",
    "grupo": "combate_melee",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "uno_de",
        "opciones": [
          {
            "tipo": "habilidad",
            "id": "combate_melee",
            "min": 1
          },
          {
            "tipo": "habilidad",
            "id": "combate_distancia",
            "min": 1
          }
        ]
      },
      {
        "tipo": "especialidad",
        "habilidad": "exploracion",
        "id": "tactica",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede apuntar a partes vitales del objetivo o buscando entorpecer las acciones de este. Pirmero *(sic)* debe reconocer una debilidad con una tirada de **perspicacia + táctica** dificultad estándar 6 como acción simple. Si tiene éxito puede realizar un ataque para entorpecer a su rival, lo podrá hacer en ataques melee o a distancia siempre que cumpla el requisito.\n\nRecibe un penalizador de -2 por dificultad al ataque, pero si obtuvo éxito crítico en la tirada de **táctico** *(sic)* no tendrá penalizador. Resuelto el ataque si tiene éxito causa **entorpecimiento** durante 1d4 turnos, el golpe crítico también casua *(sic)* efecto crítico durante el mismo tiempo.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_reconocer_debilidad",
          "label": "Reconocer debilidad",
          "economia": "simple",
          "limite": null,
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "perspicacia",
            "habilidad": "exploracion",
            "especialidad": "tactica",
            "dificultad": 6
          },
          "objetivoTira": [],
          "resultados": {
            "critico": {
              "texto": "Debilidad reconocida: tu siguiente ataque entorpecedor no lleva penalizador."
            },
            "exito": {
              "texto": "Debilidad reconocida: puedes hacer un ataque entorpecedor (melee o a distancia) con -2."
            }
          },
          "notas": []
        },
        "borrador": 0
      },
      {
        "tipo": "bono",
        "alcance": "familia:ataque_melee",
        "valor": -2,
        "condicion": "Golpe entorpecedor (debilidad reconocida)",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_melee",
          "min": 1
        },
        "borrador": 1
      },
      {
        "tipo": "bono",
        "alcance": "familia:ataque_fuego",
        "valor": -2,
        "condicion": "Golpe entorpecedor (debilidad reconocida)",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_distancia",
          "min": 1
        },
        "borrador": 2
      },
      {
        "tipo": "bono",
        "alcance": "familia:ataque_melee",
        "valor": 2,
        "condicion": "Debilidad reconocida con crítico",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_melee",
          "min": 1
        },
        "borrador": 3
      },
      {
        "tipo": "bono",
        "alcance": "familia:ataque_fuego",
        "valor": 2,
        "condicion": "Debilidad reconocida con crítico",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_distancia",
          "min": 1
        },
        "borrador": 4
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Si el ataque tiene éxito, el objetivo queda entorpecido 1d4 turnos; con crítico, entorpecido en su grado crítico durante 1d4 turnos.",
        "condicion": "Golpe entorpecedor (debilidad reconocida)",
        "porque": "tercero",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_melee",
          "min": 1
        },
        "borrador": 5
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_fuego",
        "texto": "Si el ataque tiene éxito, el objetivo queda entorpecido 1d4 turnos; con crítico, entorpecido en su grado crítico durante 1d4 turnos.",
        "condicion": "Golpe entorpecedor (debilidad reconocida)",
        "porque": "tercero",
        "requisitoAlcance": {
          "tipo": "habilidad",
          "id": "combate_distancia",
          "min": 1
        },
        "borrador": 6
      }
    ],
    "limite": null,
    "candidataUX": "acción en dos pasos: una tirada previa (Reconocer debilidad) que, al salir bien, enciende el interruptor del ataque siguiente",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_reconocer_debilidad"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_tactica_de_flanqueo",
    "label": "Táctica de Flanqueo",
    "grupo": "combate_melee",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 1
      },
      {
        "tipo": "especialidad",
        "habilidad": "exploracion",
        "id": "tactica",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Cuando un personaje con esta dote flanquea a un enemigo puede coordinar el ataque con su aliado de forma eficiente, con una acción simple o reacción, realiza un *(sic)* prueba de **reflejos + táctica** contra **perspicacia + exploración** de su rival, si tiene éxito consigue un bonificador de +3 por **flanqueo** en su siguiente ataque contra ese objetivo, si golpea con éxito al rival su compañero puede realizar un ataque de oportunidad contra el objetivo.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_tactica_de_flanqueo",
          "label": "Coordinar flanqueo",
          "economia": [
            "simple",
            "reaccion"
          ],
          "limite": null,
          "resolucion": {
            "tipo": "enfrentada",
            "aplicado": "reflejos",
            "habilidad": "exploracion",
            "especialidad": "tactica"
          },
          "objetivoTira": [
            {
              "que": "Perspicacia + Exploración"
            }
          ],
          "resultados": {
            "exito": {
              "texto": "+3 por flanqueo en tu siguiente ataque contra ese objetivo. Si le golpeas, tu aliado puede hacerle un ataque de oportunidad."
            }
          },
          "notas": [
            {
              "texto": "Solo cuando flanqueas al enemigo junto a un aliado.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      },
      {
        "tipo": "bono",
        "alcance": "familia:ataque_melee",
        "valor": 3,
        "condicion": "Flanqueo coordinado (Táctica de Flanqueo con éxito)",
        "borrador": 1
      },
      {
        "tipo": "bono",
        "alcance": "familia:ataque_fuego",
        "valor": 3,
        "condicion": "Flanqueo coordinado (Táctica de Flanqueo con éxito)",
        "borrador": 2
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "Si golpeas con éxito, tu aliado que flanquea puede hacer un ataque de oportunidad contra el objetivo.",
        "condicion": "Flanqueo coordinado (Táctica de Flanqueo con éxito)",
        "porque": "tercero",
        "borrador": 3
      }
    ],
    "limite": null,
    "candidataUX": "acción en dos pasos: la tirada de coordinar enciende el +3 del ataque siguiente",
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_tactica_de_flanqueo"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_dominio_elevado",
    "label": "Dominio Elevado",
    "grupo": "combate_melee",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "exploracion",
        "id": "tactica",
        "min": 1
      },
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Cuando el personaje realiza un ataque cuerpo a cuerpo contra un objetivo situado en una posición físicamente inferior con diferencia de altura apreciable, como escalones, desnivel, rocas o vehículos sabe sacar una ventaja notable.\n\nObtiene un bonificador de **+1 a la tirada de ataque y** el objetivo inferior sufre un **penalizador de -2 a su tirada de salvación** para mantener el equilibrio y evitar caer derribado por la pendiente o el desnivel por maniobras del atacante.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "familia:ataque_melee",
        "valor": 1,
        "condicion": "Objetivo en posición inferior (desnivel apreciable: escalones, rocas, vehículos…)",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_melee",
        "texto": "El objetivo en posición inferior sufre -2 a su salvación para mantener el equilibrio y no caer derribado por tus maniobras.",
        "condicion": "Objetivo en posición inferior (desnivel apreciable: escalones, rocas, vehículos…)",
        "porque": "tercero",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "familia:ataque_melee"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_cobertura_rapida",
    "label": "Cobertura Rápida",
    "grupo": "combate_distancia",
    "coste": 1,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "atletismo",
        "id": "acrobacias",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede deslizarse tras un movimiento para coger una cobertura agazapado como parte de una misma acción.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Puedes deslizarte tras un movimiento para ponerte a cubierto agazapado como parte de la misma acción.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_disparo_a_la_carrera_mejorado",
    "label": "Disparo a la Carrera Mejorado",
    "grupo": "combate_distancia",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_distancia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Una vez por turno el personaje puede efectuar un disparo a la carrera sin aumentar la dificultad, el disparo efectuado debe ser uno que habitualmente se resuelva como una acción simple.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "familia:ataque_fuego",
        "valor": 2,
        "condicion": "Disparo a la carrera (una vez por turno)",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_fuego",
        "texto": "Solo con un disparo que normalmente sea acción simple, y una vez por turno.",
        "condicion": "Disparo a la carrera (una vez por turno)",
        "porque": "turno",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": "N usos por turno (1): el interruptor de disparo a la carrera sin penalizador podría gastarse y reponerse por turno",
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_gran_punteria",
    "label": "Gran Puntería",
    "grupo": "combate_distancia",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "combate_distancia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Cuando obtiene éxito al apuntar a un objetivo se considera éxito crítico, pero si hubiese obtenido éxito critico *(sic)* de forma natural se reducen los niveles de cobertura del objetivo en 2 (salvo en cobertura total).",
    "efectos": [
      {
        "tipo": "sube_grado",
        "alcance": "apuntar",
        "de": "exito",
        "a": "critico",
        "condicion": null,
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "apuntar",
        "texto": "Crítico natural al apuntar: la cobertura del objetivo baja 2 niveles para tu ataque (salvo cobertura total).",
        "condicion": null,
        "grados": [
          "critico"
        ],
        "criticoNatural": true,
        "porque": "tercero",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "apuntar"
        },
        "mecanismo": "siempre_activo",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "apuntar"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_punteria_relampago",
    "label": "Puntería Relámpago",
    "grupo": "combate_distancia",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "dote",
        "id": "dote_gran_punteria"
      },
      {
        "tipo": "habilidad",
        "id": "combate_distancia",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Se puede emplear una reacción durante el turno para apuntar a un objetivo.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "apuntar",
        "texto": "Puedes apuntar como reacción durante el turno.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "economía alternativa de una acción existente (Apuntar como reacción): candidata al registro de acciones por turno",
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "apuntar"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_punteria_relampago_mejorada",
    "label": "Puntería Relámpago Mejorada",
    "grupo": "combate_distancia",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "dote",
        "id": "dote_punteria_relampago"
      },
      {
        "tipo": "atributo",
        "id": "percepcion",
        "min": 1
      },
      {
        "tipo": "habilidad",
        "id": "combate_distancia",
        "min": 3
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Se puede emplear una única acción gratuita durante el turno para apuntar a un objetivo. Además se podrá utilizar igualmente la reacción de la dote de Puntería Relámpago de la misma manera.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "apuntar",
        "texto": "Puedes apuntar con una única acción gratuita por turno.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "apuntar",
        "texto": "Sigues pudiendo apuntar como reacción (Puntería Relámpago).",
        "condicion": null,
        "porque": "turno",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": "N usos por turno (1 gratuita) + reacción: candidata al registro de acciones por turno",
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "apuntar"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "apuntar"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_precision_imperturbable",
    "label": "Precisión Imperturbable",
    "grupo": "combate_distancia",
    "coste": 8,
    "requisitos": [
      {
        "tipo": "dote",
        "id": "dote_punteria_relampago_mejorada"
      },
      {
        "tipo": "atributo",
        "id": "percepcion",
        "min": 2
      },
      {
        "tipo": "habilidad",
        "id": "combate_distancia",
        "min": 4
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": "dote_punteria_relampago_mejorada",
    "visible": true,
    "texto": "De forma gratuita el tirador apunta a cualquier objetivo.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "apuntar",
        "texto": "Apuntas a cualquier objetivo de forma gratuita.",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "apuntar"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_recarga_relampago",
    "label": "Recarga Relámpago",
    "grupo": "combate_distancia",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "agilidad",
        "min": 1
      },
      {
        "tipo": "habilidad",
        "id": "combate_distancia",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Reduce el tiempo de recarga de las armas de fuego en un grado (ej: de Acción Compleja a Estándar, o de Estándar a Simple). Si la acción de recarga ya es de tipo simple, puede recargar como acción gratuita una vez por turno o como reacción durante la ronda.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:ataque_fuego",
        "texto": "Recargar armas de fuego cuesta un grado menos (compleja → estándar, estándar → simple).",
        "condicion": null,
        "porque": "turno",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_fuego",
        "texto": "Si la recarga ya es simple: puedes recargar como acción gratuita (una vez por turno) o como reacción durante la ronda.",
        "condicion": null,
        "porque": "turno",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": "N usos por turno (recarga gratuita 1/turno) + economía de la recarga en el botón Recargar de Recursos",
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_tirador_de_larga_distancia",
    "label": "Tirador de Larga Distancia",
    "grupo": "combate_distancia",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "percepcion",
        "min": 1
      },
      {
        "tipo": "habilidad",
        "id": "combate_distancia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Si atacas a un enemigo en larga distancia el penalizador se reduce en 1 punto.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "familia:ataque_fuego",
        "valor": 1,
        "condicion": null,
        "tramo": "tramo:larga",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "bono_tramo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_tirador_de_larga_distancia_avanzado",
    "label": "Tirador de Larga Distancia Avanzado",
    "grupo": "combate_distancia",
    "coste": 5,
    "requisitos": [
      {
        "tipo": "atributo",
        "id": "percepcion",
        "min": 2
      },
      {
        "tipo": "habilidad",
        "id": "combate_distancia",
        "min": 3
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "No hay penalizador por larga distancia en ataques de especialidad.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "familia:ataque_fuego",
        "valor": 2,
        "condicion": null,
        "tramo": "tramo:larga",
        "soloEspecialidad": true,
        "noAcumulaCon": [
          "dote_tirador_de_larga_distancia"
        ],
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "bono_tramo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_arquero_poderoso",
    "label": "Arquero Poderoso",
    "grupo": "combate_distancia",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "combate_distancia",
        "id": "armas_impulsoras",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "potencia",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Con el gasto de un punto de fatiga y como acción compleja el personaje puede realizar un ataque con arco sumando su total de puntuación de **fuerza**.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:ataque_fuego",
        "texto": "Solo con arco, como acción compleja y gastando 1 punto de fatiga: el ataque suma tu puntuación total de Fuerza.",
        "condicion": null,
        "porque": "sin_regla",
        "filtroArma": {
          "especialidad": "armas_impulsoras"
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_pistolero",
    "label": "Pistolero",
    "grupo": "combate_distancia",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "combate_distancia",
        "id": "pistolas",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Si el personaje lleva una pistola en cada mano, puede efectuar un ataque con ambas como acción estándar, para ello debe llevar a cabo ataques que normalmente se resuelvan como acción simple. Ambos disparos deben ir destinados a un mismo objetivo que esté dentro de su alcance, cada ataque aumenta su dificultad en 1, se resuelve cada tirada por separado así como el daño.\n\nSi el personaje tiene la dote de desenfundado rápido puede desenfudar *(sic)* ambas pistolas como acción gratuita y realizar este ataque estándar de dos disparos simultáneos.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "familia:ataque_fuego",
        "valor": -1,
        "condicion": "Disparo doble",
        "filtroArma": {
          "empleo": "una mano",
          "especialidad": "pistolas"
        },
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_fuego",
        "texto": "Con una pistola en cada mano: dos disparos que normalmente sean acción simple, como una sola acción estándar y al mismo objetivo a tu alcance. Tira cada uno por separado, con su daño.",
        "condicion": "Disparo doble",
        "porque": "turno",
        "filtroArma": {
          "empleo": "una mano",
          "especialidad": "pistolas"
        },
        "borrador": 1
      },
      {
        "tipo": "texto",
        "lugar": "familia:ataque_fuego",
        "texto": "Con Desenfundado Rápido puedes desenfundar las dos pistolas como acción gratuita y hacer este ataque doble.",
        "condicion": "Disparo doble",
        "porque": "turno",
        "filtroArma": {
          "empleo": "una mano",
          "especialidad": "pistolas"
        },
        "borrador": 2
      }
    ],
    "limite": null,
    "candidataUX": "Dos tiradas en una acción: el disparo doble podría tirar las dos pistolas de una vez",
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_pistolero_infernal",
    "label": "Pistolero Infernal",
    "grupo": "combate_distancia",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "dote",
        "id": "dote_pistolero"
      },
      {
        "tipo": "especialidad",
        "habilidad": "combate_distancia",
        "id": "pistolas",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Si el personaje lleva una pistola a cada mano puede realizar dos ataques de fuego automático de forma simultánea como acción compleja.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "familia:ataque_fuego",
        "texto": "Con una pistola en cada mano: dos ataques de fuego automático a la vez, como acción compleja.",
        "condicion": null,
        "porque": "turno",
        "filtroArma": {
          "empleo": "una mano",
          "especialidad": "pistolas"
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "familia:ataque_fuego"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_vigilancia_tactica",
    "label": "Vigilancia Táctica",
    "grupo": "exploracion",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "exploracion",
        "id": "tactica",
        "min": 1
      },
      {
        "tipo": "aplicado",
        "id": "perspicacia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje gana un bonificador de +2 en tiradas de iniciativa en combate. Además, puede utilizar **perspicacia + táctica** en lugar de **empatía** para evitar caer una distracción resuleta *(sic)* con **manipulación**.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "grupo:Iniciativa",
        "valor": 2,
        "condicion": null,
        "borrador": 0
      },
      {
        "tipo": "cambia_par",
        "alcance": "resistir_distraccion",
        "aplicado": "perspicacia",
        "habilidad": "exploracion",
        "especialidad": "tactica",
        "condicion": "Resistir con Perspicacia + Táctica (Vigilancia Táctica)",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "grupo:Iniciativa"
        },
        "mecanismo": "siempre_activo",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "resistir_distraccion"
        },
        "mecanismo": "sustitucion_aplicado",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_encontrar_el_angulo",
    "label": "Encontrar el Ángulo",
    "grupo": "exploracion",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "exploracion",
        "id": "tactica",
        "min": 2
      },
      {
        "tipo": "aplicado",
        "id": "perspicacia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Al estudiar con rapidez el posicionamiento de un enemigo sobre el terreno, el personaje es capaz de anticipar fallas en su cobertura física. Como reacción o acción simple, puede realizar una prueba de **perspicacia + táctica** contra una dificultad estándar de 6. Si tiene éxito, reduce en 1 nivel la cobertura del objetivo para su siguiente ataque o el de un aliado al que informe. Si obtiene éxito crítico a la hora de encontrar el ángulo reduce en 2 niveles la cobertura.",
    "efectos": [
      {
        "tipo": "accion",
        "accion": {
          "id": "dotes_encontrar_el_angulo",
          "label": "Encontrar el ángulo",
          "economia": [
            "reaccion",
            "simple"
          ],
          "limite": null,
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "perspicacia",
            "habilidad": "exploracion",
            "especialidad": "tactica",
            "dificultad": 6
          },
          "objetivoTira": [],
          "resultados": {
            "exito": {
              "texto": "La cobertura del objetivo baja 1 nivel para tu siguiente ataque o el de un aliado al que informes."
            },
            "critico": {
              "texto": "La cobertura del objetivo baja 2 niveles para tu siguiente ataque o el de un aliado al que informes."
            }
          },
          "notas": [
            {
              "texto": "Estudias el posicionamiento del enemigo para anticipar fallas en su cobertura física.",
              "condicion": null
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_encontrar_el_angulo"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_rastreo_al_paso",
    "label": "Rastreo al Paso",
    "grupo": "exploracion",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "exploracion",
        "id": "supervivencia",
        "min": 2
      },
      {
        "tipo": "aplicado",
        "id": "perspicacia",
        "min": 1
      },
      {
        "tipo": "atributo",
        "id": "aguante",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje ha adaptado su zancada y visión periférica para mantener el rastreo a ritmo de marcha o carrera. Al rastrear, reduce en 3 puntos cualquier penalizador derivado por desplazarse a una velocidad superior a la recomendada por el terreno.\n\n- **En condiciones normales:** Puede desplazarse a su velocidad total sin sufrir penalizador (en lugar del -3 habitual).\n- **En condiciones adversas:** Puede desplazarse a mitad de velocidad sin penalizador (en lugar de -3) o a su velocidad total con un penalizador reducido de -3 (en lugar de -6).",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "rastreo",
        "valor": 3,
        "condicion": null,
        "tramo": "marcha:normal_total",
        "borrador": 0
      },
      {
        "tipo": "bono",
        "alcance": "rastreo",
        "valor": 3,
        "condicion": null,
        "tramo": "marcha:adversa_mitad",
        "borrador": 1
      },
      {
        "tipo": "bono",
        "alcance": "rastreo",
        "valor": 3,
        "condicion": null,
        "tramo": "marcha:adversa_total",
        "borrador": 2
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "rastreo"
        },
        "mecanismo": "bono_tramo",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "rastreo"
        },
        "mecanismo": "bono_tramo",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "rastreo"
        },
        "mecanismo": "bono_tramo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_bioma_predilecto",
    "label": "Bioma Predilecto",
    "grupo": "exploracion",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "exploracion",
        "id": "supervivencia",
        "min": 3
      }
    ],
    "eleccion": {
      "id": "bioma",
      "label": "Bioma predilecto",
      "opciones": [
        "Selva densa",
        "Zona árida",
        "Subsuelo",
        "Baja gravedad",
        "Frío extremo",
        "Otro (acordado con el máster)"
      ],
      "abierta": true
    },
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje ha asimilado profundamente las dinámicas, irregularidades y rutas de un tipo de bioma o entorno específico como selvas densas, zonas áridas, subsuelo, entornos de baja gravedad o de frío extremo.\n\nAl encontrarse en combate dentro de su bioma predilecto, el personaje gana ventaja en tiradas de iniciativa y de subsistencia, tirando dos dados y escogiendo el mejor resultado. Además, al rastrear dentro de su bioma predilecto iguala las condiciones adversas a condiciones normales.",
    "efectos": [
      {
        "tipo": "ventaja",
        "alcance": "grupo:Iniciativa",
        "condicion": "En combate dentro de tu bioma predilecto",
        "borrador": 0
      },
      {
        "tipo": "ventaja",
        "alcance": "subsistencia",
        "condicion": "Dentro de tu bioma predilecto",
        "borrador": 1
      },
      {
        "tipo": "bono",
        "alcance": "rastreo",
        "valor": 3,
        "condicion": "En tu bioma predilecto",
        "tramo": "marcha:adversa_mitad",
        "noAcumulaCon": [
          "dote_rastreo_al_paso"
        ],
        "borrador": 2
      },
      {
        "tipo": "bono",
        "alcance": "rastreo",
        "valor": 3,
        "condicion": "En tu bioma predilecto",
        "tramo": "marcha:adversa_total",
        "borrador": 3
      },
      {
        "tipo": "texto",
        "lugar": "rastreo",
        "texto": "Lo adverso cuenta como normal: tu ritmo estándar es la mitad de la velocidad de carrera, no un tercio. Con Rastreo al Paso, a velocidad total vas sin penalizador.",
        "condicion": "En tu bioma predilecto",
        "porque": "turno",
        "borrador": 4
      }
    ],
    "limite": null,
    "candidataUX": "interruptor de entorno persistente ('estoy en mi bioma') que active solo las casillas de esta dote en vez de marcarlas tirada a tirada",
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "grupo:Iniciativa"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "subsistencia"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "rastreo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "rastreo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "rastreo"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_olfato_de_investigador",
    "label": "Olfato de Investigador",
    "grupo": "exploracion",
    "coste": 2,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "exploracion",
        "id": "investigacion",
        "min": 2
      },
      {
        "tipo": "aplicado",
        "id": "perspicacia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": false,
    "texto": "*(Sin efecto en la fuente: la dote termina en la línea de requisito.)*",
    "efectos": [],
    "limite": null,
    "candidataUX": null,
    "motor": []
  },
  {
    "id": "dote_descartar_teoria",
    "label": "Descartar Teoría",
    "grupo": "exploracion",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "especialidad",
        "habilidad": "exploracion",
        "id": "investigacion",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "perspicacia",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Si el personaje fracasa en una tirada de **investigación** o se queda estancado ante una pista contradictoria, puede replantear el razonamiento y repetir la prueba asumiendo un penalizador menor de -2 en lugar de perder el hilo de la investigación. Solo se puede realizar esta acción una vez por pista o investigación.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "especialidad:investigacion",
        "valor": -2,
        "condicion": "Repitiendo la prueba con Descartar Teoría",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "especialidad:investigacion",
        "texto": "Si fracasas o te estancas ante una pista contradictoria, puedes replantear el razonamiento y repetir la prueba con −2 en vez de perder el hilo. Una vez por pista o investigación.",
        "condicion": null,
        "porque": "turno",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": "botón 'Repetir (−2)' en el resultado de un fracaso con Investigación, con contador de 1 uso por pista",
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "especialidad:investigacion"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "especialidad:investigacion"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_movimiento_sigiloso",
    "label": "Movimiento Sigiloso",
    "grupo": "sigilo",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "sigilo",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje reduce en 2 los penalizadores por moverse oculto.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "sigilo",
        "valor": 2,
        "condicion": null,
        "tramo": "movimiento_oculto:mitad",
        "borrador": 0
      },
      {
        "tipo": "bono",
        "alcance": "sigilo",
        "valor": 2,
        "condicion": null,
        "tramo": "movimiento_oculto:total",
        "borrador": 1
      },
      {
        "tipo": "bono",
        "alcance": "sigilo",
        "valor": 2,
        "condicion": null,
        "tramo": "movimiento_oculto:esprint",
        "borrador": 2
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "sigilo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "sigilo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "sigilo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_movimiento_sigiloso_mejorado",
    "label": "Movimiento Sigiloso Mejorado",
    "grupo": "sigilo",
    "coste": 5,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "sigilo",
        "min": 3
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": "dote_movimiento_sigiloso",
    "visible": true,
    "texto": "El personaje reduce en 4 los penalizadores por moverse oculto.",
    "efectos": [
      {
        "tipo": "bono",
        "alcance": "sigilo",
        "valor": 2,
        "condicion": null,
        "tramo": "movimiento_oculto:mitad",
        "borrador": 0
      },
      {
        "tipo": "bono",
        "alcance": "sigilo",
        "valor": 4,
        "condicion": null,
        "tramo": "movimiento_oculto:total",
        "borrador": 1
      },
      {
        "tipo": "bono",
        "alcance": "sigilo",
        "valor": 4,
        "condicion": null,
        "tramo": "movimiento_oculto:esprint",
        "borrador": 2
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "sigilo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "sigilo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      },
      {
        "tipo": "numerico",
        "afecta": {
          "modo": "accion_existente",
          "id": "sigilo"
        },
        "mecanismo": "eleccion_jugador",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_movimiento_sigiloso_constante",
    "label": "Movimiento Sigiloso Constante",
    "grupo": "sigilo",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "habilidad",
        "id": "sigilo",
        "min": 5
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": "dote_movimiento_sigiloso_mejorado",
    "visible": true,
    "texto": "El personaje se mueve en sigilo sin penalizador",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "sigilo",
        "texto": "Moviéndote oculto no tienes penalizador, vayas a la velocidad que vayas: no lo restes.",
        "condicion": null,
        "porque": "sin_regla",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "A velocidad total, sin penalizador por moverte oculto.",
        "condicion": null,
        "porque": "sin_regla",
        "borrador": 1
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Esprintando, sin penalizador por moverte oculto.",
        "condicion": null,
        "porque": "sin_regla",
        "borrador": 2
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "sigilo"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_potencia_psionica",
    "label": "Potencia Psiónica",
    "grupo": "tecnociencia",
    "subgrupo": "psionica",
    "coste": 3,
    "requisitos": [
      {
        "tipo": "psionico"
      },
      {
        "tipo": "disciplina",
        "id": "cualquiera",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "voluntad",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Los poderes de **nivel 1** no generan sobreesfuerzo en ningún contexto.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Los poderes de nivel 1 no generan sobreesfuerzo en ningún contexto.",
        "condicion": null,
        "porque": "sin_regla",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_maestria_psionica",
    "label": "Maestría Psiónica",
    "grupo": "tecnociencia",
    "subgrupo": "psionica",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "dote",
        "id": "dote_potencia_psionica"
      },
      {
        "tipo": "disciplina",
        "id": "cualquiera",
        "min": 5
      },
      {
        "tipo": "aplicado",
        "id": "voluntad",
        "min": 3
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": "dote_potencia_psionica",
    "visible": true,
    "texto": "Los poderes de **nivel 2 o menos** no generan sobreesfuerzo en ningún contexto. Además, cuando se realiza una tirada de salvación contra el sobreesfuerzo y se fracasa con esta dote se recibe un nivel de daño no letal, en caso de fracaso crítico el daño pasa a ser letal y el usuario queda **aturdido** un turno. Estando **exhausto** el daño por fracaso pasa a ser letal y casa *(sic)* **aturdimiento**, en caso de fracaso crítico el daño es **grave**.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Los poderes de nivel 2 o menos no generan sobreesfuerzo en ningún contexto.",
        "condicion": null,
        "porque": "sin_regla",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Salvación contra el sobreesfuerzo, fracaso: recibes 1 nivel de daño no letal.",
        "condicion": null,
        "porque": "sin_regla",
        "borrador": 1
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Salvación contra el sobreesfuerzo, fracaso crítico: el daño es letal y quedas aturdido 1 turno.",
        "condicion": null,
        "porque": "sin_regla",
        "borrador": 2
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Estando exhausto, fracaso en la salvación contra el sobreesfuerzo: el daño es letal y causa aturdimiento.",
        "condicion": "exhausto",
        "porque": "sin_regla",
        "borrador": 3
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Estando exhausto, fracaso crítico en la salvación contra el sobreesfuerzo: el daño es grave.",
        "condicion": "exhausto",
        "porque": "sin_regla",
        "borrador": 4
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_gran_maestria_psionica",
    "label": "Gran Maestría Psiónica",
    "grupo": "tecnociencia",
    "subgrupo": "psionica",
    "coste": 9,
    "requisitos": [
      {
        "tipo": "dote",
        "id": "dote_maestria_psionica"
      },
      {
        "tipo": "disciplina",
        "id": "cualquiera",
        "min": 6
      },
      {
        "tipo": "aplicado",
        "id": "voluntad",
        "min": 4
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Los poderes de **nivel 3 o menos** no generan sobreesfuerzo en ningún contexto.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Los poderes de nivel 3 o menos no generan sobreesfuerzo en ningún contexto.",
        "condicion": null,
        "porque": "sin_regla",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_saber_es_poder",
    "label": "Saber es Poder",
    "grupo": "tecnociencia",
    "subgrupo": "psionica",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "aplicado",
        "id": "perspicacia",
        "min": 3
      },
      {
        "tipo": "aplicado",
        "id": "fortaleza",
        "min": 1
      },
      {
        "tipo": "habilidad",
        "id": "biociencia",
        "min": 3
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Entiendes el proceso de *(sic)* biológico de tu poder y sabes gestionar mejor la fatiga al emplearlo. En estado de fatiga hay un 50% probabilidades de no generar sobreesfuerzo al emplear poderes psiónicos.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "Entiendes el proceso biológico de tu poder y sabes gestionar mejor la fatiga al emplearlo.",
        "condicion": null,
        "porque": "narrativo",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "ficha",
        "texto": "En estado de fatiga, al emplear poderes psiónicos hay un 50 % de probabilidades de no generar sobreesfuerzo.",
        "condicion": "fatigado",
        "porque": "sin_regla",
        "borrador": 1
      }
    ],
    "limite": null,
    "candidataUX": "tirada de 50 % (moneda) al usar un poder estando fatigado",
    "motor": [
      {
        "tipo": "narrativo",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "ninguna"
        },
        "mecanismo": null,
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_onda_residual",
    "label": "Onda Residual",
    "grupo": "tecnociencia",
    "subgrupo": "psionica",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "disciplina",
        "id": "singularidad",
        "min": 3
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "Tras desatar un estallido de **Expansión,** el eco métrico remanente perturba la física de la zona circundante. Las casillas que formaban el área de la explosión quedan cargadas de inestabilidad gravitatoria durante el turno siguiente: cualquier personaje que intente atravesarlas o iniciar un movimiento reduce su velocidad a la mitad (cada casilla se considera como si fuesen dos) y sufre un penalizador de -2 a **reflejos** mientras dure el efecto y se encuentre dentro del área afectada. El efecto no perjudica al psiónico que lo ha desencadenado.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "psi_singularidad_expansion",
        "texto": "Onda Residual: el eco métrico remanente perturba la física de la zona.",
        "condicion": null,
        "porque": "narrativo",
        "borrador": 0
      },
      {
        "tipo": "texto",
        "lugar": "psi_singularidad_expansion",
        "texto": "Onda Residual: las casillas del área de la explosión quedan cargadas de inestabilidad gravitatoria durante el turno siguiente.",
        "condicion": null,
        "porque": "tablero",
        "borrador": 1
      },
      {
        "tipo": "texto",
        "lugar": "psi_singularidad_expansion",
        "texto": "Onda Residual: quien intente atravesar esas casillas o iniciar un movimiento en ellas reduce su velocidad a la mitad (cada casilla cuenta como dos).",
        "condicion": null,
        "porque": "tablero",
        "borrador": 2
      },
      {
        "tipo": "texto",
        "lugar": "psi_singularidad_expansion",
        "texto": "Onda Residual: −2 a Reflejos mientras dure el efecto y esté dentro del área.",
        "condicion": null,
        "porque": "tercero",
        "borrador": 3
      },
      {
        "tipo": "texto",
        "lugar": "psi_singularidad_expansion",
        "texto": "Onda Residual: el efecto no perjudica al psiónico que lo ha desencadenado.",
        "condicion": null,
        "porque": "tercero",
        "borrador": 4
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "narrativo",
        "afecta": {
          "modo": "accion_existente",
          "id": "psi_singularidad_expansion"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "psi_singularidad_expansion"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "psi_singularidad_expansion"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "psi_singularidad_expansion"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      },
      {
        "tipo": "texto",
        "afecta": {
          "modo": "objetivo_tercero",
          "id": "psi_singularidad_expansion"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_impacto_metrico",
    "label": "Impacto Métrico",
    "grupo": "tecnociencia",
    "subgrupo": "psionica",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "disciplina",
        "id": "singularidad",
        "min": 2
      },
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 2
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje canaliza un eco de singularidad a través de un ataque cuerpo a cuerpo. El ataque se resuelve como **acción compleja,** puede utilizar un ataque de pelea o con un arma, consume un punto de fatiga por nivel de poder empleado, si golpea con éxito, el ataque hace un **daño adicional letal igual a 2 + nivel de poder empleado**, y el objetivo es desplazado por el impulso pudiendo caer derribado.\n\nLa energía espacial no se libera de forma genérica, sino que **adopta la trayectoria del golpe físico**. El tipo de movimiento ejecutado determina de forma natural hacia dónde sale despedido el objetivo.\n\n- **Vector Frontal** (Golpe recto, estocada, patada frontal): El objetivo es proyectado en **línea recta hacia atrás**, el objetivo tiene derecho a una tirada de salvación de **fortaleza + atletismo** dificultad 8 + nivel de poder empleado, en caso de éxito crítico no se desplaza, en caso de éxito se desplaza 2 metros x nivel de poder empleado, en caso de fracaso 4 metros x nivel de poder empleado y cae **derribado**, en caso de fracaso crítico además estará aturdido.\n- **Vector Lateral** (Gancho, codo, golpe circular): El objetivo es desplazado hacia un lateral (izquierda o derecha), de forma perpendicular o diagonal al atacante según el brazo utilizado, la tirada y los efectos son idénticos al vector frontal.\n- **Vector Ascendente** (Uppercut, rodillazo, golpe ascendente): El objetivo recibe una fuerza de elevación que lo proyecta hacia arriba, el objetivo golpeado se desplaza la mitad de forma ascendente que horizontal, el objetivo sufre los efectos de la **caída** desde la altura alcanzada además de los efectos propios del golpe igual que en el vector frontal.\n- **Vector Descendente** (volado *(sic)*, hachazo cenital, golpe descendente): En el caso de que el objetivo esté sobre frme *(sic)* la singularidad lo aplasta contra el mismo. No se desplaza metros, pero recibe un impacto de compresión vertical que le causa 1 nivel de daño adicional po *(sic)* cada dos niveles de poder empleado (mínimo 1) y aumenta en 1 la dificultad para evitar el efecto.\n\n  En el caso de que el objetivo estuviese volando, la métrica lo precipita violentamente hacia el suelo, teniendo que realizar una tirada para mantenerse en vuelo y evitar la precipitación con dificultad igual a 8 + nivel de poder empleado, si lo supera con éxito crítico recupera el control y solo se desplaza una casilla, si lo supera con éxito se desplaza 4 metros x nivel empleado, si fracasa se precipita y debe emplear una reacción para no seguir cayendo, si fracasa de forma crítica se precipita sin posibilidad de reconducir el vuelo.\n- **Modificadores por Tamaño:** El desplazamiento (tanto horizontal de 4 metros como vertical de 2 metros por nivel) **se divide entre dos** por cada categoría de tamaño superior al del atacante. El objetivo gana un **bonificador de +2 a la tirada de salvación** (de fortaleza + atletismo) para evitar derribado por cada nivel de diferencia de tamaño.\n\n  Si el objetivo es inmenso y se sale de la escala de tamaños el ataque solo causa daño adicional.",
    "efectos": [
      {
        "tipo": "poder",
        "accion": {
          "id": "dotes_impacto_metrico",
          "label": "Impacto Métrico",
          "desdeNivel": 1,
          "disciplinaNivel": "singularidad",
          "economia": "compleja",
          "resolucion": {
            "tipo": "sin_dado"
          },
          "ejes": [
            {
              "id": "nivel",
              "tipo": "nivel_empleado",
              "opciones": [
                {
                  "id": "n1",
                  "label": "Nivel 1",
                  "desdeNivel": 1,
                  "cambia": {}
                },
                {
                  "id": "n2",
                  "label": "Nivel 2",
                  "desdeNivel": 2,
                  "cambia": {}
                },
                {
                  "id": "n3",
                  "label": "Nivel 3",
                  "desdeNivel": 3,
                  "cambia": {}
                },
                {
                  "id": "n4",
                  "label": "Nivel 4",
                  "desdeNivel": 4,
                  "cambia": {}
                },
                {
                  "id": "n5",
                  "label": "Nivel 5",
                  "desdeNivel": 5,
                  "cambia": {}
                },
                {
                  "id": "n6",
                  "label": "Nivel 6",
                  "desdeNivel": 6,
                  "cambia": {}
                }
              ],
              "label": "Nivel empleado"
            },
            {
              "id": "vector",
              "tipo": "opcion",
              "opciones": [
                {
                  "id": "frontal",
                  "label": "Frontal (golpe recto, estocada, patada frontal)",
                  "cambia": {
                    "notas": [
                      {
                        "texto": "El objetivo sale proyectado en línea recta hacia atrás.",
                        "lugar": "tirada"
                      }
                    ]
                  }
                },
                {
                  "id": "lateral",
                  "label": "Lateral (gancho, codo, golpe circular)",
                  "cambia": {
                    "notas": [
                      {
                        "texto": "El objetivo sale desplazado a un lateral, perpendicular o en diagonal según el brazo; tirada y efectos como el frontal.",
                        "lugar": "tirada"
                      }
                    ]
                  }
                },
                {
                  "id": "ascendente",
                  "label": "Ascendente (uppercut, rodillazo, golpe ascendente)",
                  "cambia": {
                    "notas": [
                      {
                        "texto": "El objetivo sube la mitad de lo que se desplazaría en horizontal y sufre la caída desde esa altura, además de los efectos del frontal.",
                        "lugar": "tirada"
                      }
                    ]
                  }
                },
                {
                  "id": "descendente",
                  "label": "Descendente (voleo, hachazo cenital, golpe descendente)",
                  "cambia": {
                    "notas": [
                      {
                        "texto": "Sobre firme: no se desplaza; compresión vertical con daño adicional y +1 a la dificultad para evitar el efecto.",
                        "lugar": "tirada"
                      },
                      {
                        "texto": "Descendente: los metros de las tiradas del objetivo solo cuentan si estaba volando.",
                        "lugar": "tirada"
                      }
                    ],
                    "datos": [
                      {
                        "etiqueta": "Daño extra (letal)",
                        "valor": {
                          "base": 2,
                          "porNivel": 1
                        }
                      },
                      {
                        "etiqueta": "Daño por compresión (letal, se suma)",
                        "valor": {
                          "base": 0,
                          "porCadaNiveles": {
                            "cada": 2,
                            "minimo": 1
                          }
                        }
                      }
                    ]
                  },
                  "suma": {
                    "objetivoTira.0.dificultad": 1
                  }
                }
              ],
              "label": "Vector del golpe"
            }
          ],
          "notas": [
            {
              "texto": "Va sobre un ataque cuerpo a cuerpo: tira el ataque aparte, en Ataques, con el arma o el golpe de Pelea (Potencia + Combate Melee). Aquí solo se cobra la fatiga, que se paga aunque falle.",
              "lugar": "tirada"
            },
            {
              "texto": "Tamaño: el desplazamiento (horizontal y vertical) se divide entre dos por cada categoría de tamaño que el objetivo supere al atacante.",
              "lugar": "tirada"
            },
            {
              "texto": "Objetivo inmenso, fuera de la escala de tamaños: solo recibe el daño adicional.",
              "lugar": "tirada"
            },
            {
              "texto": "Impacta: daño del arma + daño letal adicional; el objetivo es desplazado según el vector y puede caer derribado.",
              "lugar": "tirada"
            },
            {
              "texto": "No impacta (la fatiga se paga igual).",
              "lugar": "tirada"
            }
          ],
          "manual": [],
          "motor": [
            {
              "tipo": "accion",
              "afecta": {
                "modo": "accion_nueva",
                "id": "dotes_impacto_metrico"
              },
              "mecanismo": "accion_sin_equipo",
              "estado": "construido"
            }
          ],
          "fatiga": {
            "base": 0,
            "porNivel": 1
          },
          "permiteFatigaTemporal": false,
          "alcance": null,
          "duracion": null,
          "objetivo": {
            "tipo": "unico"
          },
          "desplazamiento": {
            "base": 0,
            "porNivel": 4
          },
          "objetivoTira": [
            {
              "que": "Si es golpeado: Fortaleza + Atletismo para evitar el desplazamiento (+2 por cada categoría de tamaño que supere al atacante)",
              "dificultad": {
                "base": 8,
                "porNivel": 1
              },
              "grados": {
                "critico": "No se desplaza",
                "exito": "Se desplaza {desplazamiento/2} m",
                "fracaso": "Se desplaza {desplazamiento} m y cae derribado",
                "fracasoCritico": "Se desplaza {desplazamiento} m, cae derribado y queda aturdido 1 turno"
              }
            },
            {
              "que": "Si estaba volando: tirada para mantenerse en vuelo y evitar la precipitación",
              "dificultad": {
                "base": 8,
                "porNivel": 1
              },
              "grados": {
                "critico": "Recupera el control y solo se desplaza una casilla",
                "exito": "Se desplaza 4 m × nivel empleado ({desplazamiento} m)",
                "fracaso": "Se precipita y debe emplear una reacción para no seguir cayendo",
                "fracasoCritico": "Se precipita sin posibilidad de reconducir el vuelo"
              }
            }
          ],
          "resultados": {
            "exito": {
              "texto": "Impacta: daño del arma + daño letal adicional; el objetivo es desplazado según el vector y puede caer derribado",
              "estados": []
            },
            "fracaso": {
              "texto": "No impacta (la fatiga se paga igual)",
              "estados": []
            }
          },
          "danioPropio": null,
          "multiplesObjetivos": null,
          "togglesPropios": [],
          "bonosEnOtrasTiradas": [],
          "movimientoOtorgado": null,
          "ajustesPorNivelPoseido": [],
          "datos": [
            {
              "etiqueta": "Daño extra (letal)",
              "valor": {
                "base": 2,
                "porNivel": 1
              }
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_impacto_metrico"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_impacto_metrico_relampago",
    "label": "Impacto Métrico Relámpago",
    "grupo": "tecnociencia",
    "subgrupo": "psionica",
    "coste": 4,
    "requisitos": [
      {
        "tipo": "dote",
        "id": "dote_impacto_metrico"
      },
      {
        "tipo": "habilidad",
        "id": "combate_melee",
        "min": 3
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El personaje puede resolver el impacto métrico como acción estándar siempre y cuando que *(sic)* el ataque original no sea de mayor complejidad.",
    "efectos": [
      {
        "tipo": "texto",
        "lugar": "dotes_impacto_metrico",
        "texto": "Impacto Métrico Relámpago: puedes resolverlo como acción estándar siempre que el ataque original no sea de mayor complejidad.",
        "condicion": "El ataque original no es de mayor complejidad que una acción estándar",
        "porque": "turno",
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": "economía alternativa elegible al usar una acción (estándar en vez de compleja)",
    "motor": [
      {
        "tipo": "texto",
        "afecta": {
          "modo": "accion_existente",
          "id": "dotes_impacto_metrico"
        },
        "mecanismo": "nota_fija",
        "estado": "construido"
      }
    ]
  },
  {
    "id": "dote_sobrecarga_metrica",
    "label": "Sobrecarga Métrica",
    "grupo": "tecnociencia",
    "subgrupo": "psionica",
    "coste": 6,
    "requisitos": [
      {
        "tipo": "disciplina",
        "id": "traslacion",
        "min": 2
      },
      {
        "tipo": "aplicado",
        "id": "voluntad",
        "min": 2
      },
      {
        "tipo": "especialidad",
        "habilidad": "biociencia",
        "id": "medicina",
        "min": 1
      }
    ],
    "eleccion": null,
    "repetible": false,
    "sustituye": null,
    "visible": true,
    "texto": "El psiónico utiliza micro-desplazamientos métricos y compresión vectorial para potenciar su propia estructura física de forma temporal. Como acción simple o reacción, y con el gasto de **1 punto de fatiga por nivel de poder empleado**, el personaje sobrecarga su musculatura mediante campos métricos internos durante **un turno**.\n\nMientras dure la sobrecarga, el personaje aumenta su atributo de **Fuerza en 2 puntos + 1 por cada nivel de poder empleado**.\n\nPara canalizar la energía sin lesionarse, el personaje deberá realizar de forma simultánea una prueba de **perspicacia + medicina** con una **dificultad de 5 + nivel de poder empleado**:\n\n- **Éxito Crítico:** Soporta la tensión sin ningún tipo de daño.\n- **Éxito:** El esfuerzo genera microrroturas; recibe **1 nivel de daño no letal por cada dos niveles empleados** (mínimo 1).\n- **Fracaso:** El campo métrico desgarra la fibra muscular; recibe **1 nivel de daño letal por nivel de poder empleado**.\n- **Fracaso Crítico:** Recibe el daño letal del fracaso y, además, sufre el estado de **hemorragia durante 1d8 turnos**.",
    "efectos": [
      {
        "tipo": "poder",
        "accion": {
          "id": "dotes_sobrecarga_metrica",
          "label": "Sobrecarga Métrica",
          "desdeNivel": 1,
          "disciplinaNivel": "traslacion",
          "economia": "simple",
          "resolucion": {
            "tipo": "tirada",
            "aplicado": "perspicacia",
            "habilidad": "biociencia",
            "especialidad": "medicina",
            "dificultad": {
              "base": 5,
              "porNivel": 1
            }
          },
          "ejes": [
            {
              "id": "nivel",
              "tipo": "nivel_empleado",
              "opciones": [
                {
                  "id": "n1",
                  "label": "Nivel 1",
                  "desdeNivel": 1,
                  "cambia": {}
                },
                {
                  "id": "n2",
                  "label": "Nivel 2",
                  "desdeNivel": 2,
                  "cambia": {}
                },
                {
                  "id": "n3",
                  "label": "Nivel 3",
                  "desdeNivel": 3,
                  "cambia": {}
                },
                {
                  "id": "n4",
                  "label": "Nivel 4",
                  "desdeNivel": 4,
                  "cambia": {}
                },
                {
                  "id": "n5",
                  "label": "Nivel 5",
                  "desdeNivel": 5,
                  "cambia": {}
                },
                {
                  "id": "n6",
                  "label": "Nivel 6",
                  "desdeNivel": 6,
                  "cambia": {}
                }
              ],
              "label": "Nivel empleado"
            }
          ],
          "notas": [
            {
              "texto": "La prueba de Perspicacia + Medicina se hace a la vez que se activa la sobrecarga.",
              "lugar": "tirada"
            },
            {
              "texto": "Se usa como acción simple o reacción.",
              "lugar": "tirada"
            },
            {
              "texto": "Durante 1 turno, tu Fuerza sube 2 + nivel empleado: aplícalo a mano.",
              "lugar": "tirada"
            }
          ],
          "manual": [],
          "motor": [
            {
              "tipo": "accion",
              "afecta": {
                "modo": "accion_nueva",
                "id": "dotes_sobrecarga_metrica"
              },
              "mecanismo": "accion_sin_equipo",
              "estado": "construido"
            }
          ],
          "fatiga": {
            "base": 0,
            "porNivel": 1
          },
          "permiteFatigaTemporal": false,
          "alcance": null,
          "duracion": {
            "manual": "1 turno"
          },
          "objetivo": {
            "tipo": "propio"
          },
          "desplazamiento": null,
          "objetivoTira": [],
          "resultados": {
            "critico": {
              "texto": "Soportas la tensión sin ningún daño",
              "estados": []
            },
            "exito": {
              "texto": "Microrroturas: 1 nivel de daño no letal por cada dos niveles empleados (mínimo 1)",
              "estados": [],
              "danio": {
                "valor": {
                  "base": 0,
                  "porCadaNiveles": {
                    "cada": 2,
                    "minimo": 1
                  }
                },
                "categoria": "no letal",
                "sobre": "propio"
              }
            },
            "fracaso": {
              "texto": "El campo métrico desgarra la fibra: 1 nivel de daño letal por nivel empleado",
              "estados": [],
              "danio": {
                "valor": {
                  "base": 0,
                  "porNivel": 1
                },
                "categoria": "letal",
                "sobre": "propio"
              }
            },
            "fracasoCritico": {
              "texto": "Daño letal del fracaso y hemorragia durante 1d8 turnos",
              "estados": [
                {
                  "estado": "hemorragia",
                  "duracion": {
                    "manual": "1d8 turnos"
                  },
                  "sobre": "propio"
                }
              ],
              "danio": {
                "valor": {
                  "base": 0,
                  "porNivel": 1
                },
                "categoria": "letal",
                "sobre": "propio"
              }
            }
          },
          "danioPropio": null,
          "multiplesObjetivos": null,
          "togglesPropios": [],
          "bonosEnOtrasTiradas": [],
          "movimientoOtorgado": null,
          "ajustesPorNivelPoseido": [],
          "datos": [
            {
              "etiqueta": "Fuerza durante la sobrecarga",
              "valor": {
                "base": 2,
                "porNivel": 1
              }
            }
          ]
        },
        "borrador": 0
      }
    ],
    "limite": null,
    "candidataUX": null,
    "motor": [
      {
        "tipo": "accion",
        "afecta": {
          "modo": "accion_nueva",
          "id": "dotes_sobrecarga_metrica"
        },
        "mecanismo": "accion_sin_equipo",
        "estado": "construido"
      }
    ]
  }
];

// Recuento por tanda (lo escribe el generador):
//   193 efectos (190 en el borrador)
//   construidos: 96
//   texto: 97
//   pendientes D2b-1: 0
//   pendientes D2b-2: 0
//   pendientes D2c: 0
//   pendientes D2c-2: 0
//   pendientes D2d: 0
//   pendientes tiradas-fijas: 0
