import React, { useEffect } from 'react';

function CreateBotPage(props: {setTitle: (title: string) => void}) {
    const { setTitle } = props

    useEffect(() => {
        setTitle('Create Bot')
    }, [])

    return <div>
        <h1>Create Bot</h1>
        <p>Under construction...</p>
    </div>
}

export default CreateBotPage;