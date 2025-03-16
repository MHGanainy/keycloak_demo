import React, {
createContext,
useEffect,
useState,
useRef,
} from 'react'
import Keycloak from 'keycloak-js'

const keycloackConfig = {
url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
realm: process.env.REACT_APP_KEYCLOAK_REALM || 'document-demo',
clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'frontend-app'
};
interface KeycloakContextProps {
keycloak: Keycloak | null
authenticated: boolean
}

const KeycloakContext = createContext<KeycloakContextProps | undefined>(
undefined,
)

interface KeycloakProviderProps {
children: React.ReactNode
}

const KeycloakProvider: React.FC<KeycloakProviderProps> = ({ children }) => {
const isRun = useRef<boolean>(false)
const [keycloak, setKeycloak] = useState<Keycloak | null>(null)
const [authenticated, setAuthenticated] = useState<boolean>(false)

useEffect(() => {
    if (isRun.current) return

    isRun.current = true

    const initKeycloak = async () => {
    const keycloakInstance: Keycloak = new Keycloak(keycloackConfig)

    keycloakInstance
        .init({
        onLoad: 'check-sso',
        })
        .then((authenticated: boolean) => {
        setAuthenticated(authenticated)
        })
        .catch((error) => {
        console.error('Keycloak initialization failed:', error)
        setAuthenticated(false)
        })
        .finally(() => {
        setKeycloak(keycloakInstance)
        console.log('keycloak', keycloakInstance)
        })
    }

    initKeycloak()
}, [])

return (
    <KeycloakContext.Provider value={{ keycloak, authenticated }}>
    {children}
    </KeycloakContext.Provider>
)
}

export { KeycloakProvider, KeycloakContext }