// GENERADO por scripts/generar-catalogo-dotes.ts (npm run gen-dotes). No editar a mano:
// se cambia el borrador (docs/modelado-dotes.json) o la transcripción (docs/dotes.md) y
// se regenera. Solo los campos de compra (docs/sistema.md §9.1); los efectos, en sus tandas.
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
    "texto": "El personaje puede realizar una reacción o una acción simple para apoyar a un aliado que se encuentra en una situación difícil. Realiza una prueba de **expresión + empatía o liderazgo** con una dificultad de 7, en caso de éxito el aliado puede: relanzar una tirada de salvación contra un efecto emocional o mental que le esté afectando o realizar un *(sic)* prueba en su siguiente turno con un bonificador de +2, en caso de éxito crítico la salvación recibe un bonificador de +2 y en la prueba el bonificador pasa a ser de +3.\n\nEsta dote puede emplearse una vez por aliado por escena. Si el vínculo de afecto entre los aliados es fuerte, el personaje gana ventaja en la tirada de apoyo."
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
    "texto": "El personaje se burla de un enemigo, lo puede hacer como acción simple o como reacción si el objetivo falla una tirada delante suya. La prueba ser resuelvo *(sic)* con una tirada enfrentada de humor + expresión contra una de voluntad + actitud, la burla puede distraer o enfadar, en caso de tener éxito supone un penalizador de -1 tiradas de perspicacia y voluntad para el objeto de la burla durante 1 minuto, el penalizador es de -2 en caso de éxito crítico, el objetivo se puede resalcir *(sic)* devolviendo la broma o acertando en un ataque al personaje, en tal caso desaparecen los penalizadores y gana un bonificador de +2 por circunstancias a próximas tiradas contra burlas suyas."
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
    "texto": "Un personaje puede realizar una reacción para repetir una tirada contra un efecto de **miedo** fallado, al hacerlo hace un chiste macabro sobre la posibilidad de la fatalidad, repite la salvación con una prueba de **expresión + humor**, si tiene éxito crítico además influye en los aliados que puedan escucharle, reduciendo su nivel de miedo en un grado."
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
    "texto": "Una vez por escena el personaje puede utilizar una acción simple o una reacción para fomentar una actitud resiliente. La reacción puede ser desencadenada por un fracaso propio o el de un aliado, el personaje realiza una prueba de **expresión + humor** con dificultad 7, en caso de éxito, todos los aliados que escuchen el chascarrillo reciben un bonificador de +1 durante el próximo minuto contra efectos emocionales y reducen en 1 los penalizadores a tiradas de efectos durante el próximo turno, en caso de éxito crítico, el bonificador contra tiradas emocionales es de +2 durante el próximo minuto y reduce por completo penalizadores a tiradas de fatiga o heridas durante el próximo turno."
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
    "texto": "El personaje puede realizar una mirada como acción gratuita una vez por turno para intimidar a un objetivo, solo podrá emplearla una vez por día por objetivo."
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
    "texto": "El personaje recibe un bonificador de +1 en sus tiradas de intimidación cuando su físico pueda influir en la amenaza, en caso de que su fuerza sea de 5 o superior el bonificador es de +2."
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
    "texto": "El personaje lanza un grito de batalla aterrador como acción gratuita una vez por escena de combate, realiza una prueba de **expresión + intimidación** contra todos los enemigos en un rango de 40 metros."
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
    "texto": "Cuando el personaje reduce a 0 los puntos de golpe de un enemigo mediante un ataque cuerpo a cuerpo letal, gana una acción gratuita de **expresión + intimidación** para aterrorizar a todos los enemigos en un rango de 40 metros que puedan presenciarlo. Puede realizar esta acción una vez por escena de combate. Si el ataque que desencadena la acción es un golpe crítico, el personaje obtiene ventaja en la tirada de intimidación."
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
    "texto": "El personaje puede expresar unas palabras inspiradoras para alentar a los aliados que puedan escucharle durante una escena de combate, deberá emplear una reacción o una acción simple y una prueba de **expresión + liderazgo** dificultad 7, si tiene éxito los aliados reciben un bonifiador *(sic)* de +1 en tiradas contra efectos de miedo durante toda la escena y pueden relanzar una tirada de salvación contra un efecto de miedo que les esté afectando. Si obtiene éxito crítico en la prueba los aliados reducen en un grado su miedo de forma automática."
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
    "texto": "Lidera el inicio del combate alentando a sus compañeros que puedan presenciarle y escucharle, en el primer turno de combate como acción gratuita realiza una prueba de **liderazgo + expresión** dificultad 8, un éxito otorga +2 a la siguiente tirada contra miedo, en un éxito crítico además el primer ataque de cada aliado lo hace con ventaja."
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
    "texto": "Si el personaje resuelve con éxito crítico una prueba enfrentada o contra una dificultad de 8 o más, puede realizar como acción gratuita una tirada de **voluntad + liderazgo** para inspirar a los aliados que hayan observado la \"gesta\". La prueba para **inspirar** tiene una dificultad de 7, en caso de éxito sus aliados ganan ventaja en una única tirada que deben realizar durante el próximo minuto. Esta acción inspiradora puede hacerse una vez por escena."
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
    "texto": "El personaje puede utilizar **perspicacia + manipulación** en lugar de **empatía** para detectar cuando alguien está mintiendo, finjiendo *(sic)* u ocultando sus intenciones."
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
    "texto": "Aunque el personaje haya sido descubierto en una mentira, puede tratar de enredar el asunto con más mentiras y salir indemne. En tal caso, reduce el penalizador de dificultad en 2 en volver a mentir cuando ha sido descubierto."
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
    "texto": "Durante una escena social o antes de un combate (pudiendo usarse como tirada de iniciativa), el personaje utiliza una distracción para pillar desprevenido a su rival, debe realizar una prueba de **manipulación + expresión** enfrentada a una de **perspicacia + empatía** del objetivo, en caso de éxito el objetivo está **desprevenido contra el primer ataque**."
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
    "texto": "El personaje puede memorizar los gestos, el habla y las actitudes de otra persona para imitarlas con precisión. En caso de imitación gana un bonificador de +2 a su tirada. Si su puntuación de **interpretación** es de 3 o superior el bonificador pasa a ser de +3."
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
    "texto": "El personaje se centra en un método de negociación más analítico y menos emocional, puede utilizar su atributo de **perspicacia** en pruebas de negociación en lugar de **expresión**."
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
    "texto": "Cuando el personaje obtiene éxito crítico en una **esquiva** puede desplazarse una casilla como acción gratuita una vez por turno."
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
    "texto": "El personaje puede emplear una reacción para alejarse una casilla cuando vaya a recibir un ataque melee del que esté prevenido, moviéndose antes de que se resuelva. De esta manera si queda fuera del alcance del atacante lo esquiva de forma automática.\n\nEmplear esta reacción se contabiliza como acción defensiva."
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
    "texto": "Reduce el penalizador por acciones defensivas acumuladas en 1 pero solo en tiradas de **esquiva**."
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
    "texto": "Al realizar una tirada de equilibrio sobre una superficie inestable o resbaladizo *(sic)* en caso de obtener fallo se convierte en éxito. Además con esta dote se obtiene un bonificador de +1 en la tiradas *(sic)* para evitar ser derribado."
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
    "texto": "Cuando el personaje realice una tirada de equilibrio considera el éxito un éxito crítico."
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
    "texto": "Mantenerse a flote en medio acuático se resuelve como acción gratuita, además al moverse nadando en aguas turbulentas el fallo se considera éxito."
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
    "texto": "Los ataques melee que emplee el personaje dentro del agua no sufren penalizador de dificultad."
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
    "texto": "Al moverse el personaje omite el primer ataque de oportunidad provocado siempre que esté prevenido del atacante."
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
    "texto": "Igual que movilidad pero afecta a todos los posibles ataques de oportunidad durante el movimiento siempre que esté prevenido del atacante."
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
    "texto": "Considera tu potencia 1 punto superior a la hora de calcular la distancia de lanzamiento."
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
    "texto": "Omite un nivel de cobertura física al acertar a un objetivo con un ataque de lanzamiento."
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
    "texto": "El primer éxito en una tirada de esquiva para evitar un área contabiliza doble."
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
    "texto": "El primer éxito en una tirada de esquiva para evitar un área contabiliza triple."
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
    "texto": "El personaje reduce en 4 metros la altura efectiva de cualquier caída a efectos de cálculo de daño."
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
    "texto": "El personaje reduce en 8 metros la altura efectiva de cualquier caída a efectos de cálculo de daño."
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
    "texto": "El personaje puede realizar un ataque melee o a distancia durante un salto de forma simultánea como una única acción, se utiliza la acción más compleja."
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
    "texto": "El personaje puede realizar un ataque melee o a distancia durante un salto sin penalizador adicional de dificultad."
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
    "texto": "Una vez por turno el personaje puede emplear una acción gratuita para aferrarse a un asidero tras un salto o en una caída."
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
    "texto": "El personaje puede trepar con una mano ocupada sin ninguna penalización, pero la mano ocupada se considera está en uso durante la escalada a no ser que el personaje se pare en una posición y se quede en apoyo con los otros tres puntos."
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
    "texto": "Al correr como acción estándar o compleja considera el fracaso como éxito y el éxito como éxito crítico."
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
    "texto": "El personaje puede emplear una reacción para moverse la velocidad de su movimiento en carrera."
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
    "texto": "Si el personaje está atrapado puede emplear una reacción para tratar de escapar."
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
    "texto": "Escoge una de las siguientes parejas de afecciones: aturdimiento y confusión, ceguera y sordera, envenenamiento y enfermedad, hemorragia y herida. Para el par escogido el personaje reduce en 1 la dificultad en tiradas de medicina para su tratamiento. Además, en las afecciones seleccionadas el crítico se consigue con 5éxitos *(sic)* en lugar de 6.\n\nEsta dote puede seleccionarse más veces para distintas afecciones."
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
    "texto": "El personaje puede lanzar dos dados y escoger la mejor tirada en pruebas de diagnóstico con el gasto de un punto de fatiga."
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
    "texto": "El personaje reduce en 1 la dificultad en salvaciones contra enfermedad y efectos emocionales siempre que no esté fatigado."
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
    "texto": "El personaje es capaz de integrar cultivos enzimáticos y filtros de origen biológico en los sistemas cerrados. El personaje necesita instrumental o una valija, incrementa en un 50% la duración máxima de cualquier nivel de **Soporte Vital** instalado en su armadura o la de sus aliados con el gasto de material común biológico y una prueba de **biotecnología + perspicacia** dificultad 6 de 1 hora de duración."
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
    "texto": "Con un laboratorio o una valija, el personaje puede actuar sobre una toxina o veneno para potenciarla. Es preciso emplear material común biológico y realizar una prueba de **perspicacia + bioquímica** dificultad 5 + nivel de la toxina con un duración de 10 minutos, si tiene éxito aumenta en un nivel el tóxico, si obtiene éxito crítico aumenta en dos niveles. En caso de fracaso el veneno se echa a perder y se pierde."
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
    "texto": "El personaje reduce en 1 la dificultad de fabricación y reparación de implantes biónicos y su coste en un 10%."
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
    "texto": "El personaje reduce el coste para fabricación y reparación de implantes biónicos en un 15%, en caso de éxito crítico lo reduce en un 25%."
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
    "texto": "El personaje reduce en 1 la dificultad para realizar aumentos genéticos y su coste en un 10%."
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
    "texto": "El personaje reduce el coste para realizar aumentos genéticos en un 15%, en caso de éxito crítico lo reduce en un 25%."
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
    "texto": "El bloqueo es una acción defensiva que unicamente *(sic)* es válida contra ataques melee.\n\nCuando un personaje bloquea, utiliza un escudo, un arma melee o circunstancialmente su propio cuerpo para detener un ataque melee en su contra, si tiene éxito, desvía el ataque, pero si supera con éxito crítico a su atacante, podrá realizar un contraataque como reacción contra este. El contraataque solo puede ser de combate melee y solo podrá ser empleado si tiene el alcance adecuado.\n\nLa tirada empleada para el bloqueo es la misma de ataque del escudo o arma utilizada para parar el golpe, ciertos ataques pueden causar daños o efectos al tratar de ser bloqueados incluso cuando se tenga éxito en la acción defensiva.\n\n**Regla incluida en la dote (no es efecto de la dote):**\nSe aplican los factores circunstanciales habituales:\n\n- **Tamaño del atacante:** Por cada tamaño de diferencia entre atacante y quien bloquea, se aplica un modificador de dificultad:\n  - Por cada **tamaño mayor del atacante**, quien bloquea recibe un penalizador de dificultad de **-2**.\n  - Por cada **tamaño menor del atacante**, quien bloquea recibe una *(sic)* bonificador de **+1**.\n- Si el defensor esta *(sic)* **desarmado frente a un atacante armado**, recibe un penalizador de **-3** en su acción de bloqueo. Si el ataque natural o desarmado de quien bloquea causa **daño letal no se considera desarmado** y no se tiene en cuenta esta penalización."
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
    "texto": "Cuando el personaje bloquea un ataque melee y está en condición de contraatacar, en lugar de gastar una reacción emplea una acción gratuita. Solo se puede emplear este contraataque gratuito una vez por turno."
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
    "texto": "Cada vez que bloquea con éxito crítico un ataque melee y está en posición de contraatacar lo hace como acción gratuita, por lo que tiene contraataques ilimitados."
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
    "texto": "Puedes utilizar el atributo de **reflejos** en lugar de potencia para armas o ataques clasificadas como **sutiles**."
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
    "texto": "Si un enemigo se mueve dentro del alcance melee de un personaje, este puede emplear una reacción para realizar un ataque de oportunidad. El ataque escogido tiene que ser uno que emplee una acción simple normalmente."
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
    "texto": "Puede realizar un ataque estándar en un ataque de oportunidad."
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
    "texto": "Puedes realizar un ataque de oportunidad por turno como acción gratuita."
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
    "texto": "Los ataques de oportunidad del personaje se resuelven como acción gratuita por lo que son ilimitados."
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
    "texto": "La maniobra de arrollar es una acción de tipo **compleja** que implica movimiento y que solo se podrá realizar siempre y cuando el personaje pueda desplazarse para recorrer al menos una distancia de **10 metros**, en la distancia recorrida nunca se puede efectuar un cambio de sentido, solo de dirección, no pudiendo retroceder a las posiciones que se dejan atrás.\n\nLa maniobra permite atravesar una zona donde hay un objetivo o varios, puediendo *(sic)* incluso atacarles.\n\nAl hacer esta maniobra el personaje puede desplazarse la mitad de su movimiento básico (redondeo a la alta) pasando por encima de la casilla de un objetivo o varios. Si el terreno es difícil y le obliga a moverse a velocidad reducida no podrá realizar la maniobra en ese espacio, si se encuentra un obstáculo, este se considera objetivo y solo podrá realizarla si es capaz de destruir o derribar el obstáculo con la maniobra.\n\nDeberá realizar una tirada de ataque con el atributo de **potencia**. El resultado total será la dificultad que tienen los objetivos para evitar la maniobra y sus consecuencias, como cualquier ataque melee puede ser bloqueado o esquivado.\n\nEn caso de que la maniobra funcione con éxito crítico el objetivo recibe un **derribo** con su consecuente tirada de **potencia + atletismo** para evitarlo, aunque tenga éxito deberá apartarse de la trayectoria del atacante y este podrá continuar su marcha. Si el atacante posee alguna dote que mejore su derribo se aplica de forma automática.\n\nEn caso de maniobra exitosa el personaje puede continuar su movimiento por la casilla del objetivo y desplazarlo a una posición lateral adyacente sin hacerle daño ni derribarle, pero si no hubiese casillas adyacentes a las que desplazarse (como en un un *(sic)* pasillo estrecho) el objetivo quedaría derribado en su casilla aunque sin recibir daño.\n\nSi por el contrario la maniobra fracasa el atacante no podrá atravesar esa casilla dando por terminada la maniobra.\n\nSi fracasa de manera crítica el atacante cae derribado.\n\nA partir del primer objetivo en el trayecto, cada siguiente objetivo adicional gana un bonificador de +1 en su tirada defensiva contra la maniobra. Esta maniobra provoca ataque de oportunidad de la forma habitual.\n\nLos obstáculos se considera que siempre son acertados de manera crítica de tal manera que reciben el daño y pueden ser apartados a una casilla adyacente según naturaleza del objeto y criterio del narrador. Si el narrador ve inverosímil que el objeto sea apartado por sus características o las del terreno, el personaje podrá atravesarlo solo en caso de que le hiciese el suficiente daño como para destruirlo."
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
    "texto": "Al realizar una presa con éxito llevando un arma de una sola mano se gana una reacción para atacar con esta."
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
    "texto": "Si el personaje lleva un arma melee en cada mano, puede efectuar un ataque con ambas como acción estándar, para ello debe llevar a cabo ataques que normalmente se resuelvan como acción simple. Ambos ataques deben ir destinados a un mismo objetivo que esté dentro de su alcance, cada ataque aumenta su dificultad en 1, se resuelve cada tirada por separado así como el daño."
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
    "texto": "Cuando se utilizan dos armas cuerpo a cuerpo, se puede combinar una acción estándar y una simple en lugar de dos simples para el ataque doble."
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
    "texto": "El personaje puede utilizar una acción compleja para efectuar tres ataques melee, todos ellos reciben un penalizador de dificultad de -1, el tercer ataque irá precedido de dos ataques melee de cualquier tipo pero en él solo podrá emplear armas sutiles o golpes de pelea, en contrapartida, el atacante también recibe un penalizador en acciones defensivas de -1 hasta el comienzo de su siguiente turno."
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
    "texto": "La **combinación** elimina sus penalizadores en acciones defensivas y ofensivas siempre que se utilice el modo de **combate sutil**."
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
    "texto": "El personaje escoge una de sus especializaciones en armas para la habilidad con la que cumpla el requisito, en ataques con armas de esa especialidad el crítico sucede con 5 éxitos en lugar de 6."
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
    "texto": "Al efectuar un derribo con éxito el objetivo pierde 1 punto de fatiga, en caso de que fracase criticamente *(sic)* su salvación además pasa a estar aturdido hasta el final de su próximo turno."
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
    "texto": "El aumento de dificultad para derribo causando daño se anula, si se utiliza una acción estandar *(sic)* para derribar el daño el *(sic)* se resuelve como un ataque normal con el posible aumento por la acumulación de éxitos."
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
    "texto": "La dote sirve para armas que se puedan utilizar a una mano, se aplica en las armas con las que cumpla el requisito.\n\nEl personaje puede desenfundar un arma y hacer un ataque simple como parte de la misma acción, si es el primer disparo contra un objetivo y el atacante actúa primero el objetivo estará sorprendido contra ese ataque."
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
    "texto": "El personaje puede emplear una reacción para levantar el escudo en lugar de una acción simple."
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
    "texto": "El personaje causa daño letal al golpear con el escudo si así lo desea."
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
    "texto": "El personaje puede emplear una acción gratuita para levantar el escudo contra cualquier ataque que no esté desprevenido."
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
    "texto": "El personaje aumenta en 1 el beneficio de cobertura que otorga el escudo al levantarlo."
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
    "texto": "Si en el primer turno del combate actúas antes que un enemigo ese turno tienes una acción simple adicional para un golpe melee simple."
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
    "texto": "Como acción simple o reacción realizas una tirada de **expresión + combate melee** para engañar a un enemigo con un gesto de ataque o de movimiento, el enemigo hará una tirada enfrentada de **alerta.** Si la finta tiene **éxito** puedes realizar un ataque melee en tu siguiente acción contra el enemigo estando **sorprendido**, si tiene **éxito crítico** el enemigo pasa a estar **desprevenido**. Un **fracaso crítico** en la tirada **provoca ataque de oportunidad**.\n\nTras la primera finta contra un enemigo, las siguientes acciones de finta contra ese mismo enemigo tienen un penalizador de dificultad de -2."
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
    "texto": "No se obtiene penalizador en las siguientes acciones de finta contra un mismo enemigo previamente engañado por la maniobra."
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
    "texto": "Golpea al cuerpo con un ataque que provoque daño contundente o con un arma a dos manos, la intención no es solo dañar sino cansar a tu adversario, reduce el daño en 1 pero si el golpe tiene éxito el rival debe llevar a cabo una tirada de salvación de **fortaleza + atletismo** enfrentada al resultado del ataque original.\n\n- Éxito: Ningún Efecto.\n- Fracaso: Pierde 1 punto de fatiga.\n- Fracaso Crítico: Pierde 1 punto de fatiga y durante su siguiente turno sufrira *(sic)* **asifxia** *(sic)* grado 1."
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
    "texto": "Como parte de la misma acción el personaje puede acercarse en sigilo hasta alcanzar a un objetivo y atacarle gastando una reacción."
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
    "texto": "Si el personaje ataca a un objetivo sorprendido o desprevenido, segundos ataques mantienen la condición de sorpresivo. Esto solo se aplicará si el personaje utiliza un estilo de combate (melee o distancia) con el que cumpla los requisitos para la dote."
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
    "texto": "El personaje se considera un tamaño superior cuando realiza maniobras contra enemigos de mayor tamaño."
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
    "texto": "El personaje puede apuntar a partes vitales del objetivo o buscando entorpecer las acciones de este. Pirmero *(sic)* debe reconocer una debilidad con una tirada de **perspicacia + táctica** dificultad estándar 6 como acción simple. Si tiene éxito puede realizar un ataque para entorpecer a su rival, lo podrá hacer en ataques melee o a distancia siempre que cumpla el requisito.\n\nRecibe un penalizador de -2 por dificultad al ataque, pero si obtuvo éxito crítico en la tirada de **táctico** *(sic)* no tendrá penalizador. Resuelto el ataque si tiene éxito causa **entorpecimiento** durante 1d4 turnos, el golpe crítico también casua *(sic)* efecto crítico durante el mismo tiempo."
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
    "texto": "Cuando un personaje con esta dote flanquea a un enemigo puede coordinar el ataque con su aliado de forma eficiente, con una acción simple o reacción, realiza un *(sic)* prueba de **reflejos + táctica** contra **perspicacia + exploración** de su rival, si tiene éxito consigue un bonificador de +3 por **flanqueo** en su siguiente ataque contra ese objetivo, si golpea con éxito al rival su compañero puede realizar un ataque de oportunidad contra el objetivo."
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
    "texto": "Cuando el personaje realiza un ataque cuerpo a cuerpo contra un objetivo situado en una posición físicamente inferior con diferencia de altura apreciable, como escalones, desnivel, rocas o vehículos sabe sacar una ventaja notable.\n\nObtiene un bonificador de **+1 a la tirada de ataque y** el objetivo inferior sufre un **penalizador de -2 a su tirada de salvación** para mantener el equilibrio y evitar caer derribado por la pendiente o el desnivel por maniobras del atacante."
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
    "texto": "El personaje puede deslizarse tras un movimiento para coger una cobertura agazapado como parte de una misma acción."
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
    "texto": "Una vez por turno el personaje puede efectuar un disparo a la carrera sin aumentar la dificultad, el disparo efectuado debe ser uno que habitualmente se resuelva como una acción simple."
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
    "texto": "Cuando obtiene éxito al apuntar a un objetivo se considera éxito crítico, pero si hubiese obtenido éxito critico *(sic)* de forma natural se reducen los niveles de cobertura del objetivo en 2 (salvo en cobertura total)."
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
    "texto": "Se puede emplear una reacción durante el turno para apuntar a un objetivo."
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
    "texto": "Se puede emplear una única acción gratuita durante el turno para apuntar a un objetivo. Además se podrá utilizar igualmente la reacción de la dote de Puntería Relámpago de la misma manera."
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
    "texto": "De forma gratuita el tirador apunta a cualquier objetivo."
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
    "texto": "Reduce el tiempo de recarga de las armas de fuego en un grado (ej: de Acción Compleja a Estándar, o de Estándar a Simple). Si la acción de recarga ya es de tipo simple, puede recargar como acción gratuita una vez por turno o como reacción durante la ronda."
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
    "texto": "Si atacas a un enemigo en larga distancia el penalizador se reduce en 1 punto."
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
    "texto": "No hay penalizador por larga distancia en ataques de especialidad."
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
    "texto": "El personaje gana un bonificador de +2 en tiradas de iniciativa en combate. Además, puede utilizar **perspicacia + táctica** en lugar de **empatía** para evitar caer una distracción resuleta *(sic)* con **manipulación**."
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
    "texto": "Al estudiar con rapidez el posicionamiento de un enemigo sobre el terreno, el personaje es capaz de anticipar fallas en su cobertura física. Como reacción o acción simple, puede realizar una prueba de **perspicacia + táctica** contra una dificultad estándar de 6. Si tiene éxito, reduce en 1 nivel la cobertura del objetivo para su siguiente ataque o el de un aliado al que informe. Si obtiene éxito crítico a la hora de encontrar el ángulo reduce en 2 niveles la cobertura."
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
    "texto": "El personaje ha adaptado su zancada y visión periférica para mantener el rastreo a ritmo de marcha o carrera. Al rastrear, reduce en 3 puntos cualquier penalizador derivado por desplazarse a una velocidad superior a la recomendada por el terreno.\n\n- **En condiciones normales:** Puede desplazarse a su velocidad total sin sufrir penalizador (en lugar del -3 habitual).\n- **En condiciones adversas:** Puede desplazarse a mitad de velocidad sin penalizador (en lugar de -3) o a su velocidad total con un penalizador reducido de -3 (en lugar de -6)."
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
    "texto": "El personaje ha asimilado profundamente las dinámicas, irregularidades y rutas de un tipo de bioma o entorno específico como selvas densas, zonas áridas, subsuelo, entornos de baja gravedad o de frío extremo.\n\nAl encontrarse en combate dentro de su bioma predilecto, el personaje gana ventaja en tiradas de iniciativa y de subsistencia, tirando dos dados y escogiendo el mejor resultado. Además, al rastrear dentro de su bioma predilecto iguala las condiciones adversas a condiciones normales."
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
    "texto": "*(Sin efecto en la fuente: la dote termina en la línea de requisito.)*"
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
    "texto": "Si el personaje fracasa en una tirada de **investigación** o se queda estancado ante una pista contradictoria, puede replantear el razonamiento y repetir la prueba asumiendo un penalizador menor de -2 en lugar de perder el hilo de la investigación. Solo se puede realizar esta acción una vez por pista o investigación."
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
    "texto": "El personaje reduce en 2 los penalizadores por moverse oculto."
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
    "texto": "El personaje reduce en 4 los penalizadores por moverse oculto."
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
    "texto": "El personaje se mueve en sigilo sin penalizador"
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
    "texto": "Los poderes de **nivel 1** no generan sobreesfuerzo en ningún contexto."
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
    "texto": "Los poderes de **nivel 2 o menos** no generan sobreesfuerzo en ningún contexto. Además, cuando se realiza una tirada de salvación contra el sobreesfuerzo y se fracasa con esta dote se recibe un nivel de daño no letal, en caso de fracaso crítico el daño pasa a ser letal y el usuario queda **aturdido** un turno. Estando **exhausto** el daño por fracaso pasa a ser letal y casa *(sic)* **aturdimiento**, en caso de fracaso crítico el daño es **grave**."
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
    "texto": "Los poderes de **nivel 3 o menos** no generan sobreesfuerzo en ningún contexto."
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
    "texto": "Entiendes el proceso de *(sic)* biológico de tu poder y sabes gestionar mejor la fatiga al emplearlo. En estado de fatiga hay un 50% probabilidades de no generar sobreesfuerzo al emplear poderes psiónicos."
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
    "texto": "Tras desatar un estallido de **Expansión,** el eco métrico remanente perturba la física de la zona circundante. Las casillas que formaban el área de la explosión quedan cargadas de inestabilidad gravitatoria durante el turno siguiente: cualquier personaje que intente atravesarlas o iniciar un movimiento reduce su velocidad a la mitad (cada casilla se considera como si fuesen dos) y sufre un penalizador de -2 a **reflejos** mientras dure el efecto y se encuentre dentro del área afectada. El efecto no perjudica al psiónico que lo ha desencadenado."
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
    "texto": "El personaje canaliza un eco de singularidad a través de un ataque cuerpo a cuerpo. El ataque se resuelve como **acción compleja,** puede utilizar un ataque de pelea o con un arma, consume un punto de fatiga por nivel de poder empleado, si golpea con éxito, el ataque hace un **daño adicional letal igual a 2 + nivel de poder empleado**, y el objetivo es desplazado por el impulso pudiendo caer derribado.\n\nLa energía espacial no se libera de forma genérica, sino que **adopta la trayectoria del golpe físico**. El tipo de movimiento ejecutado determina de forma natural hacia dónde sale despedido el objetivo.\n\n- **Vector Frontal** (Golpe recto, estocada, patada frontal): El objetivo es proyectado en **línea recta hacia atrás**, el objetivo tiene derecho a una tirada de salvación de **fortaleza + atletismo** dificultad 8 + nivel de poder empleado, en caso de éxito crítico no se desplaza, en caso de éxito se desplaza 2 metros x nivel de poder empleado, en caso de fracaso 4 metros x nivel de poder empleado y cae **derribado**, en caso de fracaso crítico además estará aturdido.\n- **Vector Lateral** (Gancho, codo, golpe circular): El objetivo es desplazado hacia un lateral (izquierda o derecha), de forma perpendicular o diagonal al atacante según el brazo utilizado, la tirada y los efectos son idénticos al vector frontal.\n- **Vector Ascendente** (Uppercut, rodillazo, golpe ascendente): El objetivo recibe una fuerza de elevación que lo proyecta hacia arriba, el objetivo golpeado se desplaza la mitad de forma ascendente que horizontal, el objetivo sufre los efectos de la **caída** desde la altura alcanzada además de los efectos propios del golpe igual que en el vector frontal.\n- **Vector Descendente** (volado *(sic)*, hachazo cenital, golpe descendente): En el caso de que el objetivo esté sobre frme *(sic)* la singularidad lo aplasta contra el mismo. No se desplaza metros, pero recibe un impacto de compresión vertical que le causa 1 nivel de daño adicional po *(sic)* cada dos niveles de poder empleado (mínimo 1) y aumenta en 1 la dificultad para evitar el efecto.\n\n  En el caso de que el objetivo estuviese volando, la métrica lo precipita violentamente hacia el suelo, teniendo que realizar una tirada para mantenerse en vuelo y evitar la precipitación con dificultad igual a 8 + nivel de poder empleado, si lo supera con éxito crítico recupera el control y solo se desplaza una casilla, si lo supera con éxito se desplaza 4 metros x nivel empleado, si fracasa se precipita y debe emplear una reacción para no seguir cayendo, si fracasa de forma crítica se precipita sin posibilidad de reconducir el vuelo.\n- **Modificadores por Tamaño:** El desplazamiento (tanto horizontal de 4 metros como vertical de 2 metros por nivel) **se divide entre dos** por cada categoría de tamaño superior al del atacante. El objetivo gana un **bonificador de +2 a la tirada de salvación** (de fortaleza + atletismo) para evitar derribado por cada nivel de diferencia de tamaño.\n\n  Si el objetivo es inmenso y se sale de la escala de tamaños el ataque solo causa daño adicional."
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
    "texto": "El personaje puede resolver el impacto métrico como acción estándar siempre y cuando que *(sic)* el ataque original no sea de mayor complejidad."
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
    "texto": "El psiónico utiliza micro-desplazamientos métricos y compresión vectorial para potenciar su propia estructura física de forma temporal. Como acción simple o reacción, y con el gasto de **1 punto de fatiga por nivel de poder empleado**, el personaje sobrecarga su musculatura mediante campos métricos internos durante **un turno**.\n\nMientras dure la sobrecarga, el personaje aumenta su atributo de **Fuerza en 2 puntos + 1 por cada nivel de poder empleado**.\n\nPara canalizar la energía sin lesionarse, el personaje deberá realizar de forma simultánea una prueba de **perspicacia + medicina** con una **dificultad de 5 + nivel de poder empleado**:\n\n- **Éxito Crítico:** Soporta la tensión sin ningún tipo de daño.\n- **Éxito:** El esfuerzo genera microrroturas; recibe **1 nivel de daño no letal por cada dos niveles empleados** (mínimo 1).\n- **Fracaso:** El campo métrico desgarra la fibra muscular; recibe **1 nivel de daño letal por nivel de poder empleado**.\n- **Fracaso Crítico:** Recibe el daño letal del fracaso y, además, sufre el estado de **hemorragia durante 1d8 turnos**."
  }
];

// Nombre legible de las especialidades citadas en requisitos (id → nombre de dotes.md).
// TODO(revisar): provisional hasta el catálogo de especialidades (docs/tareas.md, "Dotes").
export const NOMBRES_ESPECIALIDAD_DOTES: Readonly<Record<string, string>> = {
  "acrobacias": "Acrobacias",
  "bionica": "Biónica",
  "bioquimica": "Bioquímica",
  "biotecnologia": "Biotecnología",
  "carrera": "Carrera",
  "empatia": "Empatía",
  "equilibrio": "Equilibrio",
  "escalada": "Escalada",
  "escapismo": "Escapismo",
  "escudos": "Escudos",
  "humor": "Humor",
  "ingenieria_genetica": "Ingeniería Genética",
  "intimidacion": "Intimidación",
  "investigacion": "Investigación",
  "lanzamiento": "Lanzamiento",
  "liderazgo": "Liderazgo",
  "manipulacion": "Manipulación",
  "medicina": "Medicina",
  "nado": "Nado",
  "negociacion": "Negociación",
  "pelea": "Pelea",
  "salto": "Salto",
  "supervivencia": "Supervivencia",
  "tactica": "Táctica"
};
