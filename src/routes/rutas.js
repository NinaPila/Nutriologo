const { Router } = require('express');
const fs = require('fs');
const router = Router();
const path = require('path');

// me traigo los datos de pacientes desde data.json
let pacientes = require('./data.json');

// calculo de imc
const calcularIMC = (peso, altura) => (peso / (altura * altura)).toFixed(2);

// calcular calorias diarias
const calcularCalorias = (peso, altura, edad, genero) => {
    let tmb;
    if (genero.toLowerCase() === 'masculino') {
        tmb = 88.36 + (13.4 * peso) + (4.8 * altura * 100) - (5.7 * edad);
    } else {
        tmb = 447.6 + (9.2 * peso) + (3.1 * altura * 100) - (4.3 * edad);
    }
    return Math.round(tmb * 1.55);
};

// recomendaciones
const generarRecomendaciones = (imc) => {
    if (imc < 18.5) {
        return {
            dieta: "Aumenta la ingesta calorica con alimentos ricos en nutrientes.",
            ejercicio: "Entrenamiento de fuerza con pesas y ejercicios de resistencia."
        };
    } else if (imc >= 18.5 && imc < 24.9) {
        return {
            dieta: "Manten una alimentacion balanceada con proteinas, carbohidratos y grasas saludables.",
            ejercicio: "Rutinas de mantenimiento con ejercicios de cardio y pesas ligeras."
        };
    } else if (imc >= 25 && imc < 29.9) {
        return {
            dieta: "Reduce el consumo de azucares y grasas saturadas.",
            ejercicio: "Ejercicio cardiovascular al menos 5 dias a la semana."
        };
    } else {
        return {
            dieta: "Consulta a un nutriologo para una dieta especializada.",
            ejercicio: "Caminar, natacion o ejercicios de bajo impacto."
        };
    }
};

// obtener todos los pacientes
router.get('/', (req, res) => {
    res.json(pacientes);
});

// obtener un paciente por ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const paciente = pacientes.find(p => p.id == id);
    
    if (!paciente) {
        return res.status(404).json({ error: "Paciente no encontrado" });
    }

    // le agregamos el imc y calorias diarias
    paciente.imc = calcularIMC(parseFloat(paciente.peso), parseFloat(paciente.altura));
    paciente.calorias = calcularCalorias(parseFloat(paciente.peso), parseFloat(paciente.altura), parseInt(paciente.edad), paciente.genero);
    
    res.json(paciente);
});

// obtener recomendaciones de dieta y ejercicio por id
router.get('/recomendaciones/:id', (req, res) => {
    const { id } = req.params;
    const paciente = pacientes.find(p => p.id == id);

    if (!paciente) {
        return res.status(404).json({ error: "Paciente no encontrado" });
    }

    const imc = calcularIMC(parseFloat(paciente.peso), parseFloat(paciente.altura));
    const recomendaciones = generarRecomendaciones(imc);

    res.json({
        paciente: paciente.nombre,
        imc,
        recomendaciones
    });
});

// agregar un nuevo paciente
router.post('/', (req, res) => {
    const { nombre, edad, peso, altura, genero } = req.body;

    if (!nombre || !edad || !peso || !altura || !genero) {
        return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // esto es para convertir a numeros la verdad no se si es necesario 
    // pero todo estaba saliendo mal, se lo puse y ya jalo D:
    const pesoNum = parseFloat(peso);
    const alturaNum = parseFloat(altura);
    const edadNum = parseInt(edad);

    if (isNaN(pesoNum) || isNaN(alturaNum) || isNaN(edadNum)) {
        return res.status(400).json({ error: "Los valores de peso, altura y edad deben ser numeros" });
    }

    // crear nuevo paciente
    const nuevoPaciente = {
        id: (pacientes.length + 1).toString(),
        nombre,
        edad: edadNum,
        peso: pesoNum,
        altura: alturaNum,
        genero,
        imc: calcularIMC(pesoNum, alturaNum),
        calorias: calcularCalorias(pesoNum, alturaNum, edadNum, genero)
    };

    pacientes.push(nuevoPaciente);

    // guardamos en el archivo data.json

    // NO ME ESTABA FUNCIONANDO CON LA LINEA DE ABAJO QUE ASI LE HICE CON LA MAYORIA
    //fs.writeFileSync('./routes/data.json', JSON.stringify(pacientes, null, 2));

    // PERO YA CON ESTA LINEA SI FUNCIONO, LA VERDAD SI TUVE QUE ACUDIR A CHATGPT POR QUE
    // LA VERDAD NO ENTENDIA EL PROBLEMA, simplemente olvide que routes esta todavia dentro de src
    fs.writeFileSync(`${__dirname}/data.json`, JSON.stringify(pacientes, null, 2));

    res.status(201).json(nuevoPaciente);
});

// actualizar un paciente por su id
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, edad, peso, altura, genero } = req.body;

    const pacienteIndex = pacientes.findIndex(p => p.id == id);

    if (pacienteIndex === -1) {
        return res.status(404).json({ error: "Paciente no encontrado" });
    }

    // actualizamos solo los datos que se nos dio
    if (nombre) pacientes[pacienteIndex].nombre = nombre;
    if (edad) pacientes[pacienteIndex].edad = parseInt(edad);
    if (peso) pacientes[pacienteIndex].peso = parseFloat(peso);
    if (altura) pacientes[pacienteIndex].altura = parseFloat(altura);
    if (genero) pacientes[pacienteIndex].genero = genero;

    // recalcular imc y calorias por el update anterior
    pacientes[pacienteIndex].imc = calcularIMC(pacientes[pacienteIndex].peso, pacientes[pacienteIndex].altura);
    pacientes[pacienteIndex].calorias = calcularCalorias(pacientes[pacienteIndex].peso, pacientes[pacienteIndex].altura, pacientes[pacienteIndex].edad, pacientes[pacienteIndex].genero);

    // guardar en el archivo PASO LO MISMO QUE EL ANTERIOR
    //fs.writeFileSync('./routes/data.json', JSON.stringify(pacientes, null, 2));
    const dataPath = path.join(__dirname, 'data.json');
    fs.writeFileSync(dataPath, JSON.stringify(pacientes, null, 2));

    res.json({ mensaje: "Paciente actualizado", paciente: pacientes[pacienteIndex] });
});


// eliminar un paciente por id
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const pacienteIndex = pacientes.findIndex(p => p.id == id);

    if (pacienteIndex === -1) {
        return res.status(404).json({ error: "Paciente no encontrado" });
    }

    // eliminar el paciente
    pacientes.splice(pacienteIndex, 1);

    // guardar en el archivo data.json
    //fs.writeFileSync('./routes/data.json', JSON.stringify(pacientes, null, 2));
    const dataPath = path.join(__dirname, 'data.json');
    fs.writeFileSync(dataPath, JSON.stringify(pacientes, null, 2));

    res.json({ mensaje: `Paciente con ID ${id} fue eliminado` });
});

module.exports = router;
