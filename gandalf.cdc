pub contract AssetControl3 {
  pub let gandalfPublic: PublicPath
  pub let assetPublic: PublicPath
  pub let assetPath: StoragePath
  pub let gandalfPath: StoragePath
  pub let gandalfPrivate: PrivatePath
  pub let assetPrivate: PrivatePath

  pub resource interface Public {
    pub fun getUsersOfOrganisation(_ apikey: String): AnyStruct
  }
  pub resource interface AssetPublic {
    pub fun getUserDeta(): {String: String}
  }
  pub resource interface Owner {
    pub fun getVault(): {String: AnyStruct}
    
    pub fun setVaultData(_ key: String, _ value: AnyStruct)
    pub fun setUserData(_ name: String, _ email: String)
  }

  pub resource interface Admin {
    pub fun getCompanyData(_ apikey: String): AnyStruct
    pub fun getCompanyApikey(_ email: String): String
    pub fun setCompanyData(_ apikey: String, _ name: String, _ email: String)
    pub fun addUsersToOrganisation(_ apikey: String, _ address: Address)
  }

  // Define the Asset resource
  pub resource Asset: Owner, AssetPublic {
    access(self) var ownerVaultData: {String: AnyStruct}
    
    pub var userData: {String: String}
    init() {
      self.ownerVaultData = {}
      self.userData = {}
    }
    pub fun getVault(): {String: AnyStruct} { return self.ownerVaultData }
    pub fun getUserDeta(): {String: String} { return self.userData }

    pub fun setVaultData(_ key: String, _ value: AnyStruct) { self.ownerVaultData[key] = value}
    pub fun setUserData(_ name: String, _ email: String) { 
    self.userData["name"] = name
    self.userData["email"] = email
    }

  }

  pub resource ProtocolData: Admin, Public {
    access(self) var allUsersOfOrganisation: {String: [Address]}
    access(self) var userData: {String: AnyStruct}
    access(self) var companyData: {String: AnyStruct}
    access(self) var companyEmails: {String: String}
    init() {
      self.allUsersOfOrganisation = {}
      self.userData = {}
      self.companyData = {}
      self.companyEmails = {}
    }
    pub fun getCompanyData(_ apikey: String): AnyStruct {return self.companyData[apikey]}
    pub fun getCompanyApikey(_ email: String): String {return self.companyEmails[email]??panic("No Company for this email address")}
    pub fun getUsersOfOrganisation(_ apikey: String): [Address] {return self.allUsersOfOrganisation[apikey]??panic("No users")}

    pub fun addUsersToOrganisation(_ apikey: String, _ address: Address) {
        if self.allUsersOfOrganisation[apikey] == nil {
            self.allUsersOfOrganisation[apikey] = [address]
        } else {
            //check if user already exists using .contains method
            if self.allUsersOfOrganisation[apikey]!.contains(address) {
                panic("User already exists")
            }
            self.allUsersOfOrganisation[apikey]!.append(address)
        }
    }
    pub fun setCompanyData(_ apikey: String, _ name: String, _ email: String) {
      self.companyData[apikey] = {"name": name, "email": email}
      self.companyEmails[email] = apikey
    }

  }

  pub fun new(): @AssetControl3.Asset {
    return <- create AssetControl3.Asset()
  }

  pub fun constructAdminData(): @AssetControl3.ProtocolData {
    return <- create AssetControl3.ProtocolData()
  }

  pub fun check(_ address: Address): Bool {
    return getAccount(address)
      .getCapability<&{AssetControl3.Public}>(AssetControl3.gandalfPublic)
      .check()
  }
  
  init(){
    self.assetPath = /storage/t2_asset
        self.assetPublic = /public/t2_asset
    self.assetPrivate = /private/t2_asset

        self.gandalfPath = /storage/t2_gandalf

    self.gandalfPublic = /public/t2_gandalf
    
    self.gandalfPrivate = /private/t2_gandalf

    //self.account.save(<- self.new(), to: self.assetPath)
    self.account.save(<- self.constructAdminData(), to: self.gandalfPath)
    self.account.link<&ProtocolData{Public}>(self.gandalfPublic, target: self.gandalfPath)
    self.account.link<&Asset{AssetPublic}>(self.assetPublic, target: self.assetPath)
    self.account.link<&Asset{AssetPublic}>(self.assetPublic, target: self.assetPath)
    self.account.link<&Asset{Owner}>(self.assetPrivate, target: self.assetPath)
    self.account.link<&ProtocolData{Admin}>(self.gandalfPrivate, target: self.gandalfPath)
    
    //self.account.borrow<&Asset{Owner}>(from: self.assetPath)!.setPassword("123ismypassword")
    //self.account.borrow<&Asset{Owner}>(from: self.assetPath)!.setVaultData("Netflix",{1:"password_netflix"})
  }
}