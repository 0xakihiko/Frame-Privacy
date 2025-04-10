import React from 'react'
import Restore from 'react-restore'

import link from '../../../../../../resources/link'
import svg from '../../../../../../resources/svg'

class AddRing extends React.Component {
  constructor (...args) {
    super(...args)
    this.state = {
      index: 0,
      adding: false,
      password: '',
      status: '',
      error: false,
      mode: 'manual',
      privateKey: '',
      keystore: '',
      keystorePassword: ''
    }
    this.forms = {
      enterPrivateKey: React.createRef(),
      manualCreatePassword: React.createRef(),
      keystorePassword: React.createRef(),
      keystoreCreatePassword: React.createRef()
    }
  }

  onChange (key, e) {
    e.preventDefault()
    const update = {}
    update[key] = e.target.value || ''
    this.setState(update)
  }

  onBlur (key, e) {
    e.preventDefault()
    const update = {}
    update[key] = this.state[key] || ''
    this.setState(update)
  }

  onFocus (key, e) {
    e.preventDefault()
    if (this.state[key] === '') {
      const update = {}
      update[key] = ''
      this.setState(update)
    }
  }

  next () {
    this.blurActive()
    this.setState({ index: ++this.state.index })
    this.focusActive()
  }

  createManual () {
    this.next()
    link.rpc('createFromPrivateKey', this.state.privateKey, this.state.password, (err, signer) => {
      if (err) {
        this.setState({ status: err, error: true })
      } else {
        this.setState({ status: 'Successful', error: false })
        setTimeout(() => {
          this.store.toggleAddAccount()
        }, 2000)
      }
    })
  }

  createKeystore () {
    this.next()
    link.rpc('createFromKeystore', this.state.keystore, this.state.keystorePassword, this.state.password, (err, signer) => {
      if (err) {
        this.setState({ status: err, error: true })
      } else {
        this.setState({ status: 'Successful', error: false })
        setTimeout(() => {
          this.store.toggleAddAccount()
        }, 2000)
      }
    })
  }

  // restart () {
  //   this.setState({ index: 0, adding: true, phrase: '', password: '', status: '', success: false, error: false })
  // }

  addManual () {
    this.setState({ mode: 'manual' })
    this.next()
  }

  addKeystore () {
    this.setState({ mode: 'keystore' })
    this.next()
    setTimeout(() => {
      link.rpc('locateKeystore', (err, keystore) => {
        if (err) {
          this.setState({ keystore: '', error: err })
        } else {
          this.setState({ keystore })
          this.next()
        }
      })
    }, 640)
  }

  restart () {
    this.setState({ index: 0, adding: false, password: '', mode: 'manual', privateKey: '', keystore: '', keystorePassword: '' })
    setTimeout(() => {
      this.setState({ status: '', error: false })
    }, 500)
    this.focusActive()
  }

  keyPress (e, next) {
    if (e.key === 'Enter') {
      e.preventDefault()
      next()
    }
  }

  adding () {
    this.setState({ adding: true })
  }

  blurActive () {
    const formInput = this.currentForm()
    if (formInput) formInput.current.blur()
  }

  focusActive () {
    setTimeout(() => {
      const formInput = this.currentForm()
      if (formInput) formInput.current.focus()
    }, 500)
  }

  currentForm () {
    let current
    if (this.state.mode === 'manual') {
      if (this.state.index === 1) current = this.forms.enterPrivateKey
      if (this.state.index === 2) current = this.forms.manualCreatePassword
    } else if (this.state.mode === 'keystore') {
      if (this.state.index === 2) current = this.forms.keystorePassword
      if (this.state.index === 3) current = this.forms.keystoreCreatePassword
    }
    return current
  }

  render () {
    let itemClass = 'phaseItem phaseItemSmart'
    if (this.state.adding) itemClass += ' phaseItemAdding'
    const { type, id } = this.store('main.currentNetwork')
    const network = type + ':' + id
    return (
      <div className={itemClass} style={{ transitionDelay: (0.64 * this.props.index / 4) + 's' }}>
        <div className='phaseItemBar phaseItemHot' />
        <div className='phaseItemWrap'>
          <div className='phaseItemTop'>
            <div className='phaseItemIcon'>
              <div className='phaseItemIconType phaseItemIconHot' style={{ marginTop: '2px' }}>{svg.octicon('key', { height: 23 })}</div>
              <div className='phaseItemIconHex phaseItemIconHexHot' />
            </div>
            <div className='phaseItemTopTitle'>Keyring</div>
            <div className='phaseItemTopTitle' />
          </div>
          <div className='phaseItemSummary'>A keyring account lets you add individual private keys to an account</div>
          <div className='phaseItemOption'>
            <div
              className='phaseItemOptionIntro' onMouseDown={() => {
                this.adding()
                if (network === 'ethereum:1') setTimeout(() => this.store.notify('hotAccountWarning'), 800)
              }}
            >
              Add Keyring Account
            </div>
            <div className='phaseItemOptionSetup' style={{ transform: `translateX(-${100 * this.state.index}%)` }}>
              <div className='phaseItemOptionSetupFrames'>
                <div className='phaseItemOptionSetupFrame'>
                  <div className='phaseItemOptionTitle'>Add Private Key</div>
                  <div className='phaseItemOptionSubmit' onMouseDown={() => this.addManual()}>Enter Manually</div>
                  <div className='phaseItemOptionSubmit' style={{ marginTop: '10px' }} onMouseDown={() => this.addKeystore()}>Use Keystore.json</div>
                </div>
                {this.state.mode === 'manual' ? (
                  <>
                    <div className='phaseItemOptionSetupFrame'>
                      <div className='phaseItemOptionTitle'>Enter Private Key</div>
                      <div className='phaseItemOptionInputPhrase'>
                        <input type='password' tabIndex='-1' ref={this.forms.enterPrivateKey} value={this.state.privateKey} onChange={e => this.onChange('privateKey', e)} onFocus={e => this.onFocus('privateKey', e)} onBlur={e => this.onBlur('privateKey', e)} onKeyPress={e => this.keyPress(e, () => this.next())} />
                      </div>
                      <div className='phaseItemOptionSubmit' onMouseDown={() => this.next()}>Next</div>
                    </div>
                    <div className='phaseItemOptionSetupFrame'>
                      <div className='phaseItemOptionTitle'>Create Password</div>
                      <div className='phaseItemOptionInputPhrase phaseItemOptionInputPassword'>
                        <div className='phaseItemOptionSubtitle'>password must be 12 characters or longer</div>
                        <input type='password' tabIndex='-1' ref={this.forms.manualCreatePassword} value={this.state.password} onChange={e => this.onChange('password', e)} onFocus={e => this.onFocus('password', e)} onBlur={e => this.onBlur('password', e)} onKeyPress={e => this.keyPress(e, () => this.createManual())} />
                      </div>
                      <div className='phaseItemOptionSubmit' onMouseDown={() => this.createManual()}>Create</div>
                    </div>
                    <div className='phaseItemOptionSetupFrame'>
                      <div className='phaseItemOptionTitle'>{this.state.status}</div>
                      {this.state.error ? <div className='phaseItemOptionSubmit' onMouseDown={() => this.restart()}>try again</div> : null}
                    </div>
                  </>
                ) : (
                  <>
                    <div className='phaseItemOptionSetupFrame'>
                      <div className='phaseItemOptionTitle'>Locating Keystore</div>
                    </div>
                    <div className='phaseItemOptionSetupFrame'>
                      <div className='phaseItemOptionTitle'>Enter Keystore Password</div>
                      <div className='phaseItemOptionInputPhrase'>
                        <input type='password' tabIndex='-1' ref={this.forms.keystorePassword} value={this.state.keystorePassword} onChange={e => this.onChange('keystorePassword', e)} onFocus={e => this.onFocus('keystorePassword', e)} onBlur={e => this.onBlur('keystorePassword', e)} onKeyPress={e => this.keyPress(e, () => this.next())} />
                      </div>
                      <div className='phaseItemOptionSubmit' onMouseDown={() => this.next()}>Next</div>
                    </div>
                    <div className='phaseItemOptionSetupFrame'>
                      <div className='phaseItemOptionTitle'>Create Account Password</div>
                      <div className='phaseItemOptionInputPhrase phaseItemOptionInputPassword'>
                        <div className='phaseItemOptionSubtitle'>password must be 12 characters or longer</div>
                        <input type='password' tabIndex='-1' ref={this.forms.keystoreCreatePassword} value={this.state.password} onChange={e => this.onChange('password', e)} onFocus={e => this.onFocus('password', e)} onBlur={e => this.onBlur('password', e)} onKeyPress={e => this.keyPress(e, () => this.createKeystore())} />
                      </div>
                      <div className='phaseItemOptionSubmit' onMouseDown={() => this.createKeystore()}>Create</div>
                    </div>
                    <div className='phaseItemOptionSetupFrame'>
                      <div className='phaseItemOptionTitle'>{this.state.status}</div>
                      {this.state.error ? <div className='phaseItemOptionSubmit' onMouseDown={() => this.restart()}>try again</div> : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className='phaseItemSummary' />
        </div>
      </div>
    )
  }
}

export default Restore.connect(AddRing)
