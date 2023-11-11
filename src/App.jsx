import React, { useState, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Stats, FirstPersonControls } from '@react-three/drei'
import { MeshNormalMaterial, BoxBufferGeometry, Vector3 } from 'three'
import { io } from 'socket.io-client'

import './App.css'

const ControlsWrapper = ({ socket, cameraRef }) => {
    const controlsRef = useRef()

    const handleMouseClick = (event) => {
        const { object } = controlsRef.current
        const { position, rotation } = object

        // Calculate the direction the camera is facing
        const direction = new Vector3(0, 0, -1)
        direction.applyQuaternion(rotation)

        // Set the initial position of the cube slightly in front of the camera
        const initialPosition = position
            .clone()
            .add(direction.multiplyScalar(2))

        // Emit an event to inform others about the new cube
        socket.emit('shoot', {
            id: socket.id,
            position: initialPosition.toArray(),
            direction: direction.toArray(),
        })
    }

    // Set the movementSpeed property
    controlsRef.current && (controlsRef.current.movementSpeed = 5)

    // Attach mouse click event listener
    useEffect(() => {
        if (controlsRef.current) {
            controlsRef.current.domElement.addEventListener(
                'click',
                handleMouseClick
            )
        }

        return () => {
            if (controlsRef.current) {
                controlsRef.current.domElement.removeEventListener(
                    'click',
                    handleMouseClick
                )
            }
        }
    }, [])

    useFrame(() => {
        if (controlsRef.current) {
            const { object } = controlsRef.current
            const { position, rotation } = object
            const posArray = position.toArray()
            const rotArray = rotation.toArray()
            socket.emit('move', {
                id: socket.id,
                rotation: rotArray,
                position: posArray,
            })
        }
    })

    return (
        <FirstPersonControls
            ref={controlsRef}
            lookSpeed={0.2}
            onMouseMove={false}
        />
    )
}

const UserWrapper = ({ position, rotation, id }) => {
    return (
        <mesh
            position={position}
            rotation={rotation}
            geometry={new BoxBufferGeometry()}
            material={new MeshNormalMaterial()}
        >
            {/* Optionally show the ID above the user's mesh */}
            <Text
                position={[0, 1.0, 0]}
                color="black"
                anchorX="center"
                anchorY="middle"
            >
                {id}
            </Text>
        </mesh>
    )
}

function App() {
    const socketClient = useRef(null)
    const cameraRef = useRef()
    const [clients, setClients] = useState({})

    useEffect(() => {
        // On mount initialize the socket connection
        socketClient.current = io()

        // Dispose gracefully
        return () => {
            if (socketClient.current) socketClient.current.disconnect()
        }
    }, [])

    useEffect(() => {
        if (socketClient.current) {
            socketClient.current.on('move', (clients) => {
                setClients(clients)
            })
        }
    }, [])

    return (
        socketClient.current && (
            <Canvas
                camera={{ position: [0, 10, -5], near: 0.1, far: 1000 }}
                onCreated={({ camera }) => (cameraRef.current = camera)}
            >
                <Stats />
                <ControlsWrapper
                    socket={socketClient.current}
                    cameraRef={cameraRef}
                />
                <gridHelper rotation={[0, 0, 0]} />

                {/* Filter myself from the client list and create user boxes with IDs */}
                {Object.keys(clients)
                    .filter(
                        (clientKey) => clientKey !== socketClient.current.id
                    )
                    .map((client) => {
                        const { position, rotation } = clients[client]
                        return (
                            <UserWrapper
                                key={client}
                                id={client}
                                position={position}
                                rotation={rotation}
                            />
                        )
                    })}
            </Canvas>
        )
    )
}

export default App
