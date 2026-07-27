/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DiamondTrap.cpp                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ldesboui <ldesboui@42angouleme.fr>         +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/17 19:01:16 by ldesboui          #+#    #+#             */
/*   Updated: 2026/03/25 17:15:33 by ldesboui         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
#include "DiamondTrap.hpp"
#include "ClapTrap.hpp"

DiamondTrap::DiamondTrap( void ) 
{
	this->ClapTrap::_name = "Clanker_clap_name";
	this->_name = "Clanker";
	this->_hitPoints = FragTrap::_hitPoints;
	this->_energy = ScavTrap::_energy;
	this->_attackDamage = FragTrap::_energy;
	std::cout << "A DiamondTrap named " << this->_name << " has been created."
		<< std::endl;
}

DiamondTrap::DiamondTrap( std::string name ) : ClapTrap(name + "_clap_name"), FragTrap(name), ScavTrap(name)
{
	this->ClapTrap::_name= name + "_clap_name";
	this->_name = name;
	this->_hitPoints = FragTrap::_hitPoints;
	this->_energy = ScavTrap::_energy;
	this->_attackDamage = FragTrap::_energy;
	std::cout << "A DiamondTrap named " 
		<< this->_name << " has been created with a cool name."<< std::endl;
}
DiamondTrap::~DiamondTrap( void )
{
	std::cout << "DiamondTrap " << this->_name << " has been destructed" << std::endl;
}

DiamondTrap::DiamondTrap(const DiamondTrap& aDiamondTrap)
{
	this->_name = aDiamondTrap._name;
	this->ClapTrap::_name = aDiamondTrap.ClapTrap::_name;
	this->_hitPoints = aDiamondTrap._hitPoints;
	this->_energy = aDiamondTrap._energy;
	this->_attackDamage = aDiamondTrap._attackDamage;
	std::cout << "a DiamondTrap named " << this->_name << " has been created, it's a clone" << std::endl;
}

DiamondTrap& DiamondTrap::operator=(const DiamondTrap& aDiamondTrap)
{
	std::cout << "DiamondTrap " << this->_name << " stole " << aDiamondTrap._name << " attributes";
	this->ClapTrap::_name = aDiamondTrap.ClapTrap::_name;
	this->_hitPoints = aDiamondTrap._hitPoints;
	this->_energy = aDiamondTrap._energy;
	this->_attackDamage = aDiamondTrap._attackDamage;
	std::cout << " it is now " << this->_name <<  std::endl;
	return (*this);

}

void	DiamondTrap::whoAmI( void )
{
	if (this->_energy > 0 && this->_hitPoints > 0)
	{
		std::cout << "I'm " << this->ClapTrap::_name << " or "<< this->_name << std::endl;
			this->_energy -= 1;
	}
	else
		std::cout << "DiamondTrap " << this->_name << " can't do anything" << std::endl;
}
